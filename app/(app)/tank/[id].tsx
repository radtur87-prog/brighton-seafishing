import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Droplets, NotebookPen, Pencil, Plus, Sparkles, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { TankCover } from '@/components/TankCard';
import { FishFormSheet, TankFormSheet } from '@/components/TankForms';
import { Button, ErrorText, Field, SectionTitle, Sheet, ui } from '@/components/ui';
import { STATUS_COLORS } from '@/components/WaterChart';
import { WaterTestSheet } from '@/components/WaterTestForm';
import { loadOverview, type Overview } from '@/lib/overview';
import { deleteFish, logTask } from '@/lib/queries';
import { completeCleaning, removeTank } from '@/lib/reminders';
import { errorMessage } from '@/lib/errors';
import { tankAge, timeAgo } from '@/lib/time';
import { BADGES } from '@/lib/agenda';
import { formatValue, PARAM_BY_KEY, STATUS_LABELS, WATER_PARAMS } from '@/lib/water';
import { CLEANING_TASK_LABELS, WATER_TYPE_LABELS, type CleaningTaskType } from '@/types/database';

const LOG_LABELS: Record<string, string> = { ...CLEANING_TASK_LABELS, feeding: 'Kŕmenie', note: 'Poznámka' };

interface TimelineEntry {
  id: string;
  at: string;
  title: string;
  detail: string | null;
}

export default function TankDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [addingFish, setAddingFish] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [writingNote, setWritingNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const now = new Date();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setError(null);
      setData(await loadOverview());
    } catch (e) {
      setError(errorMessage(e, 'Akvárium sa nepodarilo načítať.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setConfirmDelete(false);
      load();
    }, [load])
  );

  const summary = data?.summaries.find((s) => s.tank.id === id);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(errorMessage(e, 'Akcia zlyhala.'));
    } finally {
      setBusy(null);
    }
  }

  /** Logging maintenance also completes (and reschedules) a matching plan item, so the dashboard stays in sync. */
  function logMaintenance(type: CleaningTaskType) {
    return run(type, async () => {
      const schedule = data?.cleanings.find((c) => c.tank_id === id && c.task_type === type);
      if (schedule && summary) await completeCleaning(schedule, summary.tank.name);
      else await logTask(id, type);
    });
  }

  if (!data) {
    return (
      <View style={[ui.screen, ui.content]}>
        {error ? <ErrorText>{error}</ErrorText> : <Text style={ui.muted}>Načítavam...</Text>}
      </View>
    );
  }

  if (!summary) {
    return (
      <View style={[ui.screen, ui.content]}>
        <Text style={ui.body}>Toto akvárium už neexistuje.</Text>
        <Button label="Späť na akváriá" onPress={() => router.replace('/')} />
      </View>
    );
  }

  const { tank } = summary;
  const fish = data.fish.filter((f) => f.tank_id === tank.id);
  const tasks = data.agenda.filter((i) => i.schedule.tank_id === tank.id);
  // Diary: maintenance, notes and water tests in one timeline, newest first.
  const timeline: TimelineEntry[] = [
    ...data.logs
      .filter((l) => l.tank_id === tank.id && l.task_type !== 'feeding')
      .map((l) => ({
        id: l.id,
        at: l.done_at,
        title: LOG_LABELS[l.task_type] ?? l.task_type,
        detail: l.task_type === 'note' ? l.note : null,
      })),
    ...data.waterTests
      .filter((t) => t.tank_id === tank.id)
      .map((t) => ({
        id: t.id,
        at: t.measured_at,
        title: 'Meranie vody',
        detail: WATER_PARAMS.filter((p) => t[p.key] !== null)
          .map((p) => `${p.label.split(' ')[0]} ${formatValue(p.key, Number(t[p.key]))}`)
          .join(' · '),
      })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 12);
  const water = summary.water;

  function saveNote() {
    const text = noteText.trim();
    if (!text) return;
    run('note', async () => {
      await logTask(tank.id, 'note', text);
      setWritingNote(false);
      setNoteText('');
    });
  }
  const meta = [
    tank.started_at ? tankAge(tank.started_at, now) : null,
    tank.volume_liters ? `${tank.volume_liters} l` : null,
    WATER_TYPE_LABELS[tank.water_type],
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <ScrollView
      style={ui.screen}
      contentContainerStyle={ui.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
    >
      <Drawer.Screen options={{ title: tank.name }} />

      <View style={styles.coverWrap}>
        <TankCover path={tank.photo_path} height={220}>
          <View style={styles.coverText}>
            <Text style={styles.name} testID="tank-title">
              {tank.name}
            </Text>
            <Text style={styles.meta}>{meta}</Text>
          </View>
        </TankCover>
        <Pressable style={styles.editButton} onPress={() => setEditing(true)} testID="edit-tank" accessibilityLabel="Upraviť akvárium">
          <Pencil color={colors.text} size={18} />
        </Pressable>
      </View>

      {error && <ErrorText>{error}</ErrorText>}

      <View style={styles.actions}>
        <MaintenanceTile
          icon={<Droplets color={colors.primary} size={20} />}
          title="Výmena vody"
          last={summary.lastWaterChange ? timeAgo(summary.lastWaterChange, now) : 'nezapísaná'}
          busy={busy === 'water_change'}
          onPress={() => logMaintenance('water_change')}
          testID="log-water-change"
        />
        <MaintenanceTile
          icon={<Sparkles color={colors.primary} size={20} />}
          title="Čistenie filtra"
          last={summary.lastFilterClean ? timeAgo(summary.lastFilterClean, now) : 'nezapísané'}
          busy={busy === 'filter_clean'}
          onPress={() => logMaintenance('filter_clean')}
          testID="log-filter-clean"
        />
      </View>

      <View style={ui.card}>
        <SectionTitle
          right={
            <Pressable onPress={() => setAddingFish(true)} style={styles.addSmall} testID="add-fish" accessibilityLabel="Pridať rybu">
              <Plus color={colors.background} size={18} />
            </Pressable>
          }
        >
          {`Osádka · ${summary.fishTotal}`}
        </SectionTitle>
        {fish.length === 0 && <Text style={[ui.muted, styles.gapTop]}>Zatiaľ žiadne ryby. Pridaj ich tlačidlom +.</Text>}
        {fish.map((f) => (
          <View key={f.id} style={styles.listRow}>
            <Text style={styles.listText}>
              {f.count}× {f.species}
              {f.nickname ? <Text style={ui.muted}>{` · ${f.nickname}`}</Text> : null}
            </Text>
            <Pressable onPress={() => run(`fish-${f.id}`, () => deleteFish(f.id))} hitSlop={10} accessibilityLabel={`Odobrať ${f.species}`}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        ))}
      </View>

      <View style={ui.card}>
        <SectionTitle
          right={
            <Pressable onPress={() => router.push('/plan')}>
              <Text style={styles.linkText}>Upraviť plán</Text>
            </Pressable>
          }
        >
          Dnes
        </SectionTitle>
        {tasks.length === 0 && <Text style={[ui.muted, styles.gapTop]}>Na dnes nič naplánované.</Text>}
        {tasks.map((item) => (
          <View key={item.id} style={styles.listRow}>
            <Text style={styles.badge}>{BADGES[item.kind]}</Text>
            <Text style={styles.listText}>
              {item.kind === 'feeding'
                ? `${item.schedule.time_of_day.slice(0, 5)} ${item.schedule.food_type ?? ''}`
                : item.kind === 'lighting'
                  ? `od ${item.schedule.start_time.slice(0, 5)}`
                  : CLEANING_TASK_LABELS[item.schedule.task_type]}
            </Text>
          </View>
        ))}
      </View>

      <View style={ui.card} testID="tank-water">
        <SectionTitle
          right={
            <Pressable onPress={() => router.push(`/water?tank=${tank.id}`)}>
              <Text style={styles.linkText}>Grafy</Text>
            </Pressable>
          }
        >
          Hodnoty vody
        </SectionTitle>
        {water ? (
          <View style={[styles.waterRow, styles.gapTop]}>
            <View style={[styles.waterDot, { backgroundColor: STATUS_COLORS[water.status] }]} />
            <Text style={styles.listText}>
              {water.status === 'ok' ? 'Všetko v poriadku' : water.problems.map((p) => `${PARAM_BY_KEY[p.param].label} ${formatValue(p.param, p.value)} – ${STATUS_LABELS[p.status]}`).join(', ')}
            </Text>
            <Text style={ui.muted}>{timeAgo(water.measured_at, now)}</Text>
          </View>
        ) : (
          <Text style={[ui.muted, styles.gapTop]}>Zatiaľ nemerané.</Text>
        )}
        <Button label="Zapísať meranie" variant="secondary" onPress={() => setMeasuring(true)} testID="tank-add-water" style={styles.gapTop} />
      </View>

      <View style={ui.card}>
        <SectionTitle
          right={
            <Pressable onPress={() => setWritingNote(true)} style={styles.addSmall} testID="add-note" accessibilityLabel="Pridať poznámku">
              <NotebookPen color={colors.background} size={16} />
            </Pressable>
          }
        >
          Denník
        </SectionTitle>
        {timeline.length === 0 && <Text style={[ui.muted, styles.gapTop]}>Zatiaľ žiadne záznamy.</Text>}
        {timeline.map((entry) => (
          <View key={entry.id} style={styles.listRow} testID="history-row">
            <View style={{ flex: 1 }}>
              <Text style={styles.listText}>{entry.title}</Text>
              {entry.detail ? <Text style={ui.muted}>{entry.detail}</Text> : null}
            </View>
            <Text style={ui.muted}>{timeAgo(entry.at, now)}</Text>
          </View>
        ))}
      </View>

      {confirmDelete ? (
        <View style={[ui.card, { gap: spacing.sm }]}>
          <Text style={ui.body}>Zmazať akvárium aj všetky jeho ryby, plány a históriu?</Text>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              label="Áno, zmazať"
              variant="danger"
              onPress={() =>
                run('delete', async () => {
                  await removeTank(tank.id);
                  router.replace('/');
                })
              }
              style={{ flex: 1 }}
            />
            <Button label="Nie" variant="secondary" onPress={() => setConfirmDelete(false)} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <Button label="Zmazať akvárium" variant="ghost" onPress={() => setConfirmDelete(true)} testID="delete-tank" />
      )}

      <TankFormSheet
        visible={editing}
        tank={tank}
        onClose={() => setEditing(false)}
        onSaved={() => {
          setEditing(false);
          load();
        }}
      />
      <WaterTestSheet
        tankId={measuring ? tank.id : null}
        onClose={() => setMeasuring(false)}
        onSaved={() => {
          setMeasuring(false);
          load();
        }}
      />
      <Sheet
        visible={writingNote}
        title="Poznámka do denníka"
        onClose={() => setWritingNote(false)}
        footer={
          <View style={{ paddingHorizontal: 24 }}>
            <Button label={busy === 'note' ? 'Ukladám...' : 'Uložiť poznámku'} onPress={saveNote} disabled={busy !== null || !noteText.trim()} testID="save-note" />
          </View>
        }
      >
        <Field
          placeholder="napr. pridal som 2 rastliny, jedna ryba nežerie..."
          value={noteText}
          onChangeText={setNoteText}
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
          testID="note-text"
        />
      </Sheet>
      <FishFormSheet
        tankId={addingFish ? tank.id : null}
        onClose={() => setAddingFish(false)}
        onSaved={() => {
          setAddingFish(false);
          load();
        }}
      />
    </ScrollView>
  );
}

function MaintenanceTile({
  icon,
  title,
  last,
  busy,
  onPress,
  testID,
}: {
  icon: ReactNode;
  title: string;
  last: string;
  busy: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <View style={[ui.card, styles.tile]}>
      <View style={styles.tileHead}>
        {icon}
        <Text style={styles.tileTitle}>{title}</Text>
      </View>
      <Text style={ui.muted}>Naposledy: {last}</Text>
      <Button label={busy ? 'Ukladám...' : 'Hotovo dnes ✓'} onPress={onPress} disabled={busy} testID={testID} />
    </View>
  );
}

const styles = StyleSheet.create({
  coverWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  coverText: { padding: spacing.md },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' },
  meta: { color: '#CFE7EC', fontSize: 14, marginTop: 2 },
  editButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    backgroundColor: 'rgba(3,12,20,0.6)',
    borderRadius: radius.pill,
    padding: 10,
  },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flex: 1, minWidth: 220, gap: spacing.sm },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tileTitle: { color: colors.text, fontSize: 16, fontWeight: '700' },
  addSmall: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapTop: { marginTop: spacing.sm },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  listText: { color: colors.text, fontSize: 15, flex: 1 },
  badge: { color: colors.primary, fontSize: 12, fontWeight: '700', width: 92 },
  linkText: { color: colors.primary, fontWeight: '600' },
  waterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  waterDot: { width: 10, height: 10, borderRadius: 5 },
});
