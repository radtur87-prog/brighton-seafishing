import { useCallback, useState, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Plus, Trash2, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import {
  CLEANING_TASK_LABELS,
  DAY_LABELS,
  type CleaningSchedule,
  type CleaningTaskType,
  type FeedingSchedule,
  type LightingSchedule,
  type Tank,
} from '@/types/database';
import { fetchCleaningSchedules, fetchFeedingSchedules, fetchLightingSchedules, fetchTanks } from '@/lib/queries';
import {
  addCleaningSchedule,
  addFeedingSchedule,
  addLightingSchedule,
  removeCleaningSchedule,
  removeFeedingSchedule,
  removeLightingSchedule,
} from '@/lib/reminders';
import { notificationsSupported } from '@/lib/notifications';
import { TimeField } from '@/components/TimeField';
import { addMinutesToTime, formatDuration, nextDueDate, toDbTime, type TimeOfDay } from '@/lib/time';
import { errorMessage } from '@/lib/errors';

const CLEANING_TYPES: CleaningTaskType[] = ['water_change', 'filter_clean', 'glass_clean', 'gravel_vacuum', 'other'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function daysLabel(days: number[]): string {
  return days.length === 7 ? 'Každý deň' : days.map((d) => DAY_LABELS[d]).join(', ');
}

export default function ScheduleScreen() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [feedings, setFeedings] = useState<FeedingSchedule[]>([]);
  const [cleanings, setCleanings] = useState<CleaningSchedule[]>([]);
  const [lightings, setLightings] = useState<LightingSchedule[]>([]);
  const [modal, setModal] = useState<'feeding' | 'cleaning' | 'lighting' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [t, f, c, l] = await Promise.all([
        fetchTanks(),
        fetchFeedingSchedules(),
        fetchCleaningSchedules(),
        fetchLightingSchedules(),
      ]);
      setTanks(t);
      setFeedings(f);
      setCleanings(c);
      setLightings(l);
    } catch (e) {
      setError(errorMessage(e, 'Plán sa nepodarilo načítať.'));
    } finally {
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tankName = (id: string) => tanks.find((t) => t.id === id)?.name ?? 'Akvárium';

  async function run(action: () => Promise<void>) {
    try {
      setError(null);
      await action();
    } catch (e) {
      setError(errorMessage(e, 'Akcia zlyhala.'));
    }
  }

  if (loaded && tanks.length === 0) {
    return (
      <View style={styles.container}>
          {error && <Text style={styles.error}>{error}</Text>}
        <Text style={styles.empty}>
          Najprv pridaj akvárium v záložke „Akváriá“, potom tu nastavíš kŕmenie, čistenie a osvetlenie.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      {!notificationsSupported && (
        <Text style={styles.notice}>
          Pripomienky (notifikácie) fungujú v mobilnej appke. Vo webovej verzii vidíš dnešné úlohy na úvodnej strane a v Kalendári.
        </Text>
      )}
      {error && <Text style={styles.error}>{error}</Text>}

      <Section title="🐟 Kŕmenie" onAdd={() => setModal('feeding')} addTestID="add-feeding">
        {feedings.length === 0 && <Text style={styles.empty}>Žiadny plán kŕmenia.</Text>}
        {feedings.map((f) => (
          <ScheduleCard
            key={f.id}
            title={`${f.time_of_day.slice(0, 5)} · ${tankName(f.tank_id)}`}
            lines={[f.food_type ?? '', daysLabel(f.days_of_week)].filter(Boolean)}
            onDelete={() =>
              run(async () => {
                await removeFeedingSchedule(f);
                setFeedings((prev) => prev.filter((x) => x.id !== f.id));
              })
            }
          />
        ))}
      </Section>

      <Section title="🧽 Čistenie / údržba" onAdd={() => setModal('cleaning')} addTestID="add-cleaning">
        {cleanings.length === 0 && <Text style={styles.empty}>Žiadny plán čistenia.</Text>}
        {cleanings.map((c) => (
          <ScheduleCard
            key={c.id}
            title={`${CLEANING_TASK_LABELS[c.task_type]} · ${tankName(c.tank_id)}`}
            lines={[
              `Každých ${c.interval_days} dní`,
              `Ďalší termín: ${new Date(c.next_due_at).toLocaleDateString('sk-SK')}`,
            ]}
            onDelete={() =>
              run(async () => {
                await removeCleaningSchedule(c);
                setCleanings((prev) => prev.filter((x) => x.id !== c.id));
              })
            }
          />
        ))}
      </Section>

      <Section title="💡 Osvetlenie" onAdd={() => setModal('lighting')} addTestID="add-lighting">
        {lightings.length === 0 && <Text style={styles.empty}>Žiadny plán osvetlenia.</Text>}
        {lightings.map((l) => (
          <ScheduleCard
            key={l.id}
            title={`${l.start_time.slice(0, 5)}–${addMinutesToTime(l.start_time, l.duration_minutes)} · ${tankName(l.tank_id)}`}
            lines={[`${formatDuration(l.duration_minutes)} svietenia`, daysLabel(l.days_of_week)]}
            onDelete={() =>
              run(async () => {
                await removeLightingSchedule(l);
                setLightings((prev) => prev.filter((x) => x.id !== l.id));
              })
            }
          />
        ))}
      </Section>

      <FeedingModal
        visible={modal === 'feeding'}
        tanks={tanks}
        onClose={() => setModal(null)}
        onCreated={(s) => {
          setFeedings((prev) => [...prev, s].sort((a, b) => a.time_of_day.localeCompare(b.time_of_day)));
          setModal(null);
        }}
      />
      <CleaningModal
        visible={modal === 'cleaning'}
        tanks={tanks}
        onClose={() => setModal(null)}
        onCreated={(s) => {
          setCleanings((prev) => [...prev, s].sort((a, b) => a.next_due_at.localeCompare(b.next_due_at)));
          setModal(null);
        }}
      />
      <LightingModal
        visible={modal === 'lighting'}
        tanks={tanks}
        onClose={() => setModal(null)}
        onCreated={(s) => {
          setLightings((prev) => [...prev, s].sort((a, b) => a.start_time.localeCompare(b.start_time)));
          setModal(null);
        }}
      />
    </ScrollView>
  );
}

function Section({
  title,
  onAdd,
  addTestID,
  children,
}: {
  title: string;
  onAdd: () => void;
  addTestID: string;
  children: ReactNode;
}) {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Pressable style={styles.addButton} onPress={onAdd} testID={addTestID} accessibilityLabel="Pridať">
          <Plus color={colors.background} size={18} />
        </Pressable>
      </View>
      {children}
    </>
  );
}

function ScheduleCard({ title, lines, onDelete }: { title: string; lines: string[]; onDelete: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Pressable onPress={onDelete} hitSlop={10} accessibilityLabel="Zmazať">
          <Trash2 color={colors.danger} size={18} />
        </Pressable>
      </View>
      {lines.map((line) => (
        <Text key={line} style={styles.cardMeta}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function FormModal({
  visible,
  title,
  onClose,
  onSave,
  saving,
  error,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: spacing.sm }}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityLabel="Zavrieť">
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>
          {children}
          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable style={styles.saveButton} onPress={onSave} disabled={saving} testID="save-schedule">
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť plán'}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

function TankPicker({ tanks, value, onChange }: { tanks: Tank[]; value: string; onChange: (id: string) => void }) {
  return (
    <>
      <Text style={styles.label}>Akvárium</Text>
      <View style={styles.chipRow}>
        {tanks.map((t) => (
          <Pressable key={t.id} style={[styles.chip, value === t.id && styles.chipActive]} onPress={() => onChange(t.id)}>
            <Text style={[styles.chipText, value === t.id && styles.chipTextActive]}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function DayPicker({ value, onChange }: { value: number[]; onChange: (days: number[]) => void }) {
  return (
    <>
      <Text style={styles.label}>Dni v týždni</Text>
      <View style={styles.chipRow}>
        {DAY_LABELS.map((label, idx) => {
          const active = value.includes(idx);
          return (
            <Pressable
              key={label}
              style={[styles.dayChip, active && styles.chipActive]}
              onPress={() =>
                onChange(active ? value.filter((d) => d !== idx) : [...value, idx].sort((a, b) => a - b))
              }
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </>
  );
}

function useTankChoice(tanks: Tank[]) {
  const [picked, setPicked] = useState<string>('');
  const tankId = tanks.some((t) => t.id === picked) ? picked : (tanks[0]?.id ?? '');
  const tankName = tanks.find((t) => t.id === tankId)?.name ?? 'Akvárium';
  return { tankId, tankName, setTankId: setPicked };
}

interface ModalProps<T> {
  visible: boolean;
  tanks: Tank[];
  onClose: () => void;
  onCreated: (s: T) => void;
}

function FeedingModal({ visible, tanks, onClose, onCreated }: ModalProps<FeedingSchedule>) {
  const { tankId, tankName, setTankId } = useTankChoice(tanks);
  const [time, setTime] = useState<TimeOfDay>({ hour: 8, minute: 0 });
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [foodType, setFoodType] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!tankId) return setError('Vyber akvárium.');
    if (days.length === 0) return setError('Vyber aspoň jeden deň.');
    setSaving(true);
    setError(null);
    try {
      const schedule = await addFeedingSchedule(
        {
          tank_id: tankId,
          time_of_day: toDbTime(time),
          days_of_week: days,
          food_type: foodType.trim() || null,
          amount_note: amount.trim() || null,
        },
        tankName
      );
      setFoodType('');
      setAmount('');
      onCreated(schedule);
    } catch (e) {
      setError(errorMessage(e, 'Plán kŕmenia sa nepodarilo uložiť.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Nový plán kŕmenia" onClose={onClose} onSave={handleSave} saving={saving} error={error}>
      <TankPicker tanks={tanks} value={tankId} onChange={setTankId} />
      <Text style={styles.label}>Čas kŕmenia</Text>
      <TimeField value={time} onChange={setTime} testID="feeding-time" />
      <DayPicker value={days} onChange={setDays} />
      <TextInput
        style={styles.input}
        placeholder="Typ krmiva (napr. vločky)"
        placeholderTextColor={colors.textMuted}
        value={foodType}
        onChangeText={setFoodType}
      />
      <TextInput
        style={styles.input}
        placeholder="Dávka (napr. štipka, zje za 2 min)"
        placeholderTextColor={colors.textMuted}
        value={amount}
        onChangeText={setAmount}
      />
    </FormModal>
  );
}

function CleaningModal({ visible, tanks, onClose, onCreated }: ModalProps<CleaningSchedule>) {
  const { tankId, tankName, setTankId } = useTankChoice(tanks);
  const [taskType, setTaskType] = useState<CleaningTaskType>('water_change');
  const [intervalDays, setIntervalDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!tankId) return setError('Vyber akvárium.');
    const interval = Number(intervalDays);
    if (!Number.isInteger(interval) || interval <= 0 || interval > 365) {
      return setError('Zadaj interval ako celé číslo od 1 do 365 dní.');
    }
    setSaving(true);
    setError(null);
    try {
      const schedule = await addCleaningSchedule(
        {
          tank_id: tankId,
          task_type: taskType,
          interval_days: interval,
          next_due_at: nextDueDate(new Date(), interval).toISOString(),
        },
        tankName
      );
      onCreated(schedule);
    } catch (e) {
      setError(errorMessage(e, 'Plán čistenia sa nepodarilo uložiť.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Nový plán čistenia" onClose={onClose} onSave={handleSave} saving={saving} error={error}>
      <TankPicker tanks={tanks} value={tankId} onChange={setTankId} />
      <Text style={styles.label}>Typ úlohy</Text>
      <View style={styles.chipRow}>
        {CLEANING_TYPES.map((type) => (
          <Pressable
            key={type}
            style={[styles.chip, taskType === type && styles.chipActive]}
            onPress={() => setTaskType(type)}
          >
            <Text style={[styles.chipText, taskType === type && styles.chipTextActive]}>{CLEANING_TASK_LABELS[type]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Opakovať každých (dní)</Text>
      <TextInput
        style={styles.input}
        keyboardType="number-pad"
        value={intervalDays}
        onChangeText={setIntervalDays}
        testID="cleaning-interval"
      />
    </FormModal>
  );
}

function LightingModal({ visible, tanks, onClose, onCreated }: ModalProps<LightingSchedule>) {
  const { tankId, tankName, setTankId } = useTankChoice(tanks);
  const [start, setStart] = useState<TimeOfDay>({ hour: 10, minute: 0 });
  const [durationHours, setDurationHours] = useState('8');
  const [days, setDays] = useState<number[]>(ALL_DAYS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!tankId) return setError('Vyber akvárium.');
    if (days.length === 0) return setError('Vyber aspoň jeden deň.');
    const durationMinutes = Math.round(Number(durationHours.replace(',', '.')) * 60);
    if (!durationMinutes || durationMinutes <= 0 || durationMinutes > 24 * 60) {
      return setError('Zadaj dĺžku svietenia od 0,5 do 24 hodín.');
    }
    setSaving(true);
    setError(null);
    try {
      const schedule = await addLightingSchedule(
        { tank_id: tankId, start_time: toDbTime(start), duration_minutes: durationMinutes, days_of_week: days },
        tankName
      );
      onCreated(schedule);
    } catch (e) {
      setError(errorMessage(e, 'Plán osvetlenia sa nepodarilo uložiť.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <FormModal visible={visible} title="Nový plán osvetlenia" onClose={onClose} onSave={handleSave} saving={saving} error={error}>
      <TankPicker tanks={tanks} value={tankId} onChange={setTankId} />
      <Text style={styles.label}>Čas zapnutia</Text>
      <TimeField value={start} onChange={setStart} testID="lighting-start" />
      <Text style={styles.label}>Dĺžka svietenia (hodiny)</Text>
      <TextInput
        style={styles.input}
        placeholder="napr. 8"
        placeholderTextColor={colors.textMuted}
        keyboardType="decimal-pad"
        value={durationHours}
        onChangeText={setDurationHours}
        testID="lighting-duration"
      />
      <DayPicker value={days} onChange={setDays} />
    </FormModal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  notice: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
  addButton: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colors.danger, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 15, fontWeight: '700', flexShrink: 1 },
  cardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '90%',
    flexGrow: 0,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  modalTitle: { color: colors.text, fontSize: 20, fontWeight: '700' },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 15,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.textMuted, fontSize: 13 },
  chipTextActive: { color: colors.background, fontWeight: '600' },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: { color: '#04201C', fontWeight: '700', fontSize: 15 },
});
