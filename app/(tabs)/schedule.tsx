import { useCallback, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
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
import {
  createCleaningSchedule,
  createFeedingSchedule,
  createLightingSchedule,
  deleteCleaningSchedule,
  deleteFeedingSchedule,
  deleteLightingSchedule,
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchLightingSchedules,
  fetchTanks,
  updateCleaningScheduleNotification,
  updateFeedingScheduleNotification,
  updateLightingScheduleNotifications,
} from '@/lib/queries';
import {
  cancelNotificationGroup,
  ensureNotificationPermission,
  scheduleCleaningNotification,
  scheduleFeedingNotifications,
  scheduleLightingNotifications,
} from '@/lib/notifications';

const CLEANING_TYPES: CleaningTaskType[] = [
  'water_change',
  'filter_clean',
  'glass_clean',
  'gravel_vacuum',
  'other',
];

export default function ScheduleScreen() {
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [feedings, setFeedings] = useState<FeedingSchedule[]>([]);
  const [cleanings, setCleanings] = useState<CleaningSchedule[]>([]);
  const [lightings, setLightings] = useState<LightingSchedule[]>([]);
  const [showAddFeeding, setShowAddFeeding] = useState(false);
  const [showAddCleaning, setShowAddCleaning] = useState(false);
  const [showAddLighting, setShowAddLighting] = useState(false);
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
      setError(e instanceof Error ? e.message : 'Chyba pri načítaní plánu.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const tankName = (id: string) => tanks.find((t) => t.id === id)?.name ?? 'Akvárium';

  async function handleDeleteFeeding(schedule: FeedingSchedule) {
    await cancelNotificationGroup(schedule.notification_id);
    await deleteFeedingSchedule(schedule.id);
    setFeedings((prev) => prev.filter((f) => f.id !== schedule.id));
  }

  async function handleDeleteCleaning(schedule: CleaningSchedule) {
    await cancelNotificationGroup(schedule.notification_id);
    await deleteCleaningSchedule(schedule.id);
    setCleanings((prev) => prev.filter((c) => c.id !== schedule.id));
  }

  async function handleDeleteLighting(schedule: LightingSchedule) {
    await cancelNotificationGroup(schedule.notification_on_id);
    await cancelNotificationGroup(schedule.notification_off_id);
    await deleteLightingSchedule(schedule.id);
    setLightings((prev) => prev.filter((l) => l.id !== schedule.id));
  }

  function formatEndTime(start: string, durationMinutes: number): string {
    const [h, m] = start.split(':').map(Number);
    const total = (h * 60 + m + durationMinutes) % 1440;
    const endH = Math.floor(total / 60);
    const endM = total % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  }

  if (tanks.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Plán</Text>
        <Text style={styles.empty}>
          Najprv pridaj akvárium v záložke „Akváriá“, potom tu nastavíš kŕmenie a čistenie.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <Text style={styles.title}>Plán</Text>
      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🐟 Kŕmenie</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddFeeding(true)}>
          <Plus color={colors.background} size={18} />
        </Pressable>
      </View>
      {feedings.length === 0 && <Text style={styles.empty}>Žiadny plán kŕmenia.</Text>}
      {feedings.map((f) => (
        <View key={f.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {f.time_of_day.slice(0, 5)} · {tankName(f.tank_id)}
            </Text>
            <Pressable onPress={() => handleDeleteFeeding(f)} hitSlop={10}>
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </View>
          {f.food_type && <Text style={styles.cardMeta}>{f.food_type}</Text>}
          <Text style={styles.cardMeta}>
            {f.days_of_week.length === 7
              ? 'Každý deň'
              : f.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}
          </Text>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🧽 Čistenie / údržba</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddCleaning(true)}>
          <Plus color={colors.background} size={18} />
        </Pressable>
      </View>
      {cleanings.length === 0 && <Text style={styles.empty}>Žiadny plán čistenia.</Text>}
      {cleanings.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {CLEANING_TASK_LABELS[c.task_type]} · {tankName(c.tank_id)}
            </Text>
            <Pressable onPress={() => handleDeleteCleaning(c)} hitSlop={10}>
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </View>
          <Text style={styles.cardMeta}>Každých {c.interval_days} dní</Text>
          <Text style={styles.cardMeta}>
            Ďalší termín: {new Date(c.next_due_at).toLocaleDateString('sk-SK')}
          </Text>
        </View>
      ))}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>💡 Osvetlenie</Text>
        <Pressable style={styles.addButton} onPress={() => setShowAddLighting(true)}>
          <Plus color={colors.background} size={18} />
        </Pressable>
      </View>
      {lightings.length === 0 && <Text style={styles.empty}>Žiadny plán osvetlenia.</Text>}
      {lightings.map((l) => (
        <View key={l.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>
              {l.start_time.slice(0, 5)}–{formatEndTime(l.start_time, l.duration_minutes)} ·{' '}
              {tankName(l.tank_id)}
            </Text>
            <Pressable onPress={() => handleDeleteLighting(l)} hitSlop={10}>
              <Trash2 color={colors.danger} size={18} />
            </Pressable>
          </View>
          <Text style={styles.cardMeta}>
            {Math.floor(l.duration_minutes / 60)} h {l.duration_minutes % 60} min svietenia
          </Text>
          <Text style={styles.cardMeta}>
            {l.days_of_week.length === 7
              ? 'Každý deň'
              : l.days_of_week.map((d) => DAY_LABELS[d]).join(', ')}
          </Text>
        </View>
      ))}

      <AddFeedingModal
        visible={showAddFeeding}
        tanks={tanks}
        onClose={() => setShowAddFeeding(false)}
        onCreated={(schedule) => {
          setFeedings((prev) => [...prev, schedule]);
          setShowAddFeeding(false);
        }}
      />

      <AddCleaningModal
        visible={showAddCleaning}
        tanks={tanks}
        onClose={() => setShowAddCleaning(false)}
        onCreated={(schedule) => {
          setCleanings((prev) => [...prev, schedule]);
          setShowAddCleaning(false);
        }}
      />

      <AddLightingModal
        visible={showAddLighting}
        tanks={tanks}
        onClose={() => setShowAddLighting(false)}
        onCreated={(schedule) => {
          setLightings((prev) => [...prev, schedule]);
          setShowAddLighting(false);
        }}
      />
    </ScrollView>
  );
}

function AddFeedingModal({
  visible,
  tanks,
  onClose,
  onCreated,
}: {
  visible: boolean;
  tanks: Tank[];
  onClose: () => void;
  onCreated: (s: FeedingSchedule) => void;
}) {
  const [tankId, setTankId] = useState(tanks[0]?.id ?? '');
  const [time, setTime] = useState(new Date(0, 0, 0, 8, 0));
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [foodType, setFoodType] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function handleSave() {
    const effectiveTankId = tankId || tanks[0]?.id;
    if (!effectiveTankId) {
      setError('Vyber akvárium.');
      return;
    }
    if (days.length === 0) {
      setError('Vyber aspoň jeden deň.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hh = String(time.getHours()).padStart(2, '0');
      const mm = String(time.getMinutes()).padStart(2, '0');
      const schedule = await createFeedingSchedule({
        tank_id: effectiveTankId,
        time_of_day: `${hh}:${mm}:00`,
        days_of_week: days,
        food_type: foodType.trim() || null,
      });

      const granted = await ensureNotificationPermission();
      if (granted) {
        const tank = tanks.find((t) => t.id === effectiveTankId);
        const notificationId = await scheduleFeedingNotifications(schedule, tank?.name ?? 'Akvárium');
        await updateFeedingScheduleNotification(schedule.id, notificationId);
        schedule.notification_id = notificationId;
      }

      onCreated(schedule);
      setFoodType('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa uložiť plán kŕmenia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nový plán kŕmenia</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <Text style={styles.label}>Akvárium</Text>
          <View style={styles.chipRow}>
            {tanks.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.chip, tankId === t.id && styles.chipActive]}
                onPress={() => setTankId(t.id)}
              >
                <Text style={[styles.chipText, tankId === t.id && styles.chipTextActive]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Čas kŕmenia</Text>
          <DateTimePicker
            value={time}
            mode="time"
            display="spinner"
            onChange={(_, selected) => selected && setTime(selected)}
            themeVariant="dark"
          />

          <Text style={styles.label}>Dni v týždni</Text>
          <View style={styles.chipRow}>
            {DAY_LABELS.map((label, idx) => (
              <Pressable
                key={label}
                style={[styles.dayChip, days.includes(idx) && styles.chipActive]}
                onPress={() => toggleDay(idx)}
              >
                <Text style={[styles.chipText, days.includes(idx) && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={styles.input}
            placeholder="Typ krmiva (voliteľné)"
            placeholderTextColor={colors.textMuted}
            value={foodType}
            onChangeText={setFoodType}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť plán'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddCleaningModal({
  visible,
  tanks,
  onClose,
  onCreated,
}: {
  visible: boolean;
  tanks: Tank[];
  onClose: () => void;
  onCreated: (s: CleaningSchedule) => void;
}) {
  const [tankId, setTankId] = useState(tanks[0]?.id ?? '');
  const [taskType, setTaskType] = useState<CleaningTaskType>('water_change');
  const [intervalDays, setIntervalDays] = useState('7');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const effectiveTankId = tankId || tanks[0]?.id;
    if (!effectiveTankId) {
      setError('Vyber akvárium.');
      return;
    }
    const interval = Number(intervalDays);
    if (!interval || interval <= 0) {
      setError('Zadaj platný interval v dňoch.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const nextDue = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
      const schedule = await createCleaningSchedule({
        tank_id: effectiveTankId,
        task_type: taskType,
        interval_days: interval,
        next_due_at: nextDue.toISOString(),
      });

      const granted = await ensureNotificationPermission();
      if (granted) {
        const tank = tanks.find((t) => t.id === effectiveTankId);
        const notificationId = await scheduleCleaningNotification(schedule, tank?.name ?? 'Akvárium');
        await updateCleaningScheduleNotification(schedule.id, notificationId);
        schedule.notification_id = notificationId;
      }

      onCreated(schedule);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa uložiť plán čistenia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nový plán čistenia</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <Text style={styles.label}>Akvárium</Text>
          <View style={styles.chipRow}>
            {tanks.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.chip, tankId === t.id && styles.chipActive]}
                onPress={() => setTankId(t.id)}
              >
                <Text style={[styles.chipText, tankId === t.id && styles.chipTextActive]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Typ úlohy</Text>
          <View style={styles.chipRow}>
            {CLEANING_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.chip, taskType === type && styles.chipActive]}
                onPress={() => setTaskType(type)}
              >
                <Text style={[styles.chipText, taskType === type && styles.chipTextActive]}>
                  {CLEANING_TASK_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Interval (dni)</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={intervalDays}
            onChangeText={setIntervalDays}
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť plán'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function AddLightingModal({
  visible,
  tanks,
  onClose,
  onCreated,
}: {
  visible: boolean;
  tanks: Tank[];
  onClose: () => void;
  onCreated: (s: LightingSchedule) => void;
}) {
  const [tankId, setTankId] = useState(tanks[0]?.id ?? '');
  const [startTime, setStartTime] = useState(new Date(0, 0, 0, 9, 0));
  const [durationHours, setDurationHours] = useState('8');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));
  }

  async function handleSave() {
    const effectiveTankId = tankId || tanks[0]?.id;
    if (!effectiveTankId) {
      setError('Vyber akvárium.');
      return;
    }
    if (days.length === 0) {
      setError('Vyber aspoň jeden deň.');
      return;
    }
    const durationMinutes = Math.round(Number(durationHours) * 60);
    if (!durationMinutes || durationMinutes <= 0) {
      setError('Zadaj platnú dĺžku svietenia.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const hh = String(startTime.getHours()).padStart(2, '0');
      const mm = String(startTime.getMinutes()).padStart(2, '0');
      const schedule = await createLightingSchedule({
        tank_id: effectiveTankId,
        start_time: `${hh}:${mm}:00`,
        duration_minutes: durationMinutes,
        days_of_week: days,
      });

      const granted = await ensureNotificationPermission();
      if (granted) {
        const tank = tanks.find((t) => t.id === effectiveTankId);
        const { onId, offId } = await scheduleLightingNotifications(schedule, tank?.name ?? 'Akvárium');
        await updateLightingScheduleNotifications(schedule.id, onId, offId);
        schedule.notification_on_id = onId;
        schedule.notification_off_id = offId;
      }

      onCreated(schedule);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa uložiť plán osvetlenia.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nový plán osvetlenia</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color={colors.textMuted} size={22} />
            </Pressable>
          </View>

          <Text style={styles.label}>Akvárium</Text>
          <View style={styles.chipRow}>
            {tanks.map((t) => (
              <Pressable
                key={t.id}
                style={[styles.chip, tankId === t.id && styles.chipActive]}
                onPress={() => setTankId(t.id)}
              >
                <Text style={[styles.chipText, tankId === t.id && styles.chipTextActive]}>{t.name}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Čas zapnutia</Text>
          <DateTimePicker
            value={startTime}
            mode="time"
            display="spinner"
            onChange={(_, selected) => selected && setStartTime(selected)}
            themeVariant="dark"
          />

          <Text style={styles.label}>Dĺžka svietenia (hodiny)</Text>
          <TextInput
            style={styles.input}
            placeholder="napr. 8"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={durationHours}
            onChangeText={setDurationHours}
          />

          <Text style={styles.label}>Dni v týždni</Text>
          <View style={styles.chipRow}>
            {DAY_LABELS.map((label, idx) => (
              <Pressable
                key={label}
                style={[styles.dayChip, days.includes(idx) && styles.chipActive]}
                onPress={() => toggleDay(idx)}
              >
                <Text style={[styles.chipText, days.includes(idx) && styles.chipTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            <Text style={styles.saveButtonText}>{saving ? 'Ukladám...' : 'Uložiť plán'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 64,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.surfaceAlt,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
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
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  chipTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  saveButtonText: {
    color: '#04201C',
    fontWeight: '700',
    fontSize: 15,
  },
});
