import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import { Droplets, Pencil, Plus, Sparkles, X } from 'lucide-react-native';
import { colors, radius, spacing } from '@/constants/theme';
import { TankCover } from '@/components/TankCard';
import { FishFormSheet, TankFormSheet } from '@/components/TankForms';
import { Button, ErrorText, SectionTitle, ui } from '@/components/ui';
import { loadOverview, type Overview } from '@/lib/overview';
import { deleteFish, logTask } from '@/lib/queries';
import { completeCleaning, removeTank } from '@/lib/reminders';
import { errorMessage } from '@/lib/errors';
import { tankAge, timeAgo } from '@/lib/time';
import { BADGES } from '@/lib/agenda';
import { CLEANING_TASK_LABELS, WATER_TYPE_LABELS, type CleaningTaskType } from '@/types/database';

const LOG_LABELS: Record<string, string> = { ...CLEANING_TASK_LABELS, feeding: 'Kŕmenie' };

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
  const history = data.logs.filter((l) => l.tank_id === tank.id).slice(0, 8);
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

      <View style={ui.card}>
        <SectionTitle>História</SectionTitle>
        {history.length === 0 && <Text style={[ui.muted, styles.gapTop]}>Zatiaľ žiadne záznamy.</Text>}
        {history.map((log) => (
          <View key={log.id} style={styles.listRow} testID="history-row">
            <Text style={styles.listText}>{LOG_LABELS[log.task_type] ?? log.task_type}</Text>
            <Text style={ui.muted}>{timeAgo(log.done_at, now)}</Text>
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
});
