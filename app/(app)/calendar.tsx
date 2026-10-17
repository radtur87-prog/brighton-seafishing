import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing } from '@/constants/theme';
import { CLEANING_TASK_LABELS } from '@/types/database';
import {
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchFeedingsDoneSince,
  fetchLightingSchedules,
  fetchTanks,
  logFeedingDone,
} from '@/lib/queries';
import { completeCleaning } from '@/lib/reminders';
import { addMinutesToTime, startOfDay } from '@/lib/time';
import { BADGES, buildAgenda, type AgendaItem } from '@/lib/agenda';
import { errorMessage } from '@/lib/errors';

export default function DashboardScreen() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      const [tanks, feedings, cleanings, lightings, done] = await Promise.all([
        fetchTanks(),
        fetchFeedingSchedules(),
        fetchCleaningSchedules(),
        fetchLightingSchedules(),
        fetchFeedingsDoneSince(startOfDay(now)),
      ]);
      setItems(buildAgenda(now, tanks, feedings, cleanings, lightings, done));
    } catch (e) {
      setError(errorMessage(e, 'Úlohy sa nepodarilo načítať.'));
    } finally {
      setLoading(false);
      setLoaded(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function markDone(item: AgendaItem) {
    try {
      if (item.kind === 'feeding') await logFeedingDone(item.schedule);
      if (item.kind === 'cleaning') await completeCleaning(item.schedule, item.tankName);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (e) {
      setError(errorMessage(e, 'Úlohu sa nepodarilo označiť.'));
    }
  }

  const taskCount = items.filter((i) => i.kind !== 'lighting').length;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dnes</Text>
      <Text style={styles.subtitle} testID="dashboard-summary">
        {!loaded ? 'Načítavam...' : taskCount === 0 ? 'Na dnes máš všetko hotové 🎉' : `Úlohy na dnes: ${taskCount}`}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card} testID={`agenda-${item.kind}`}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardBadge}>{BADGES[item.kind]}</Text>
              {item.kind === 'cleaning' && item.overdue && <Text style={styles.overdueBadge}>Po termíne</Text>}
            </View>
            <Text style={styles.cardTitle}>
              {item.kind === 'feeding'
                ? item.schedule.food_type || 'Nakŕmiť ryby'
                : item.kind === 'lighting'
                  ? 'Svetlo zapnuté'
                  : CLEANING_TASK_LABELS[item.schedule.task_type]}
            </Text>
            <Text style={styles.cardMeta}>{item.tankName}</Text>
            {item.kind === 'feeding' && (
              <Text style={styles.cardMeta}>
                ⏰ {item.schedule.time_of_day.slice(0, 5)}
                {item.schedule.amount_note ? ` · ${item.schedule.amount_note}` : ''}
              </Text>
            )}
            {item.kind === 'lighting' && (
              <Text style={styles.cardMeta}>
                ⏰ {item.schedule.start_time.slice(0, 5)}–
                {addMinutesToTime(item.schedule.start_time, item.schedule.duration_minutes)}
              </Text>
            )}
            {item.kind !== 'lighting' && (
              <Pressable style={styles.doneButton} onPress={() => markDone(item)} testID="mark-done">
                <Text style={styles.doneButtonText}>Hotovo ✓</Text>
              </Pressable>
            )}
          </View>
        )}
        ListEmptyComponent={
          loaded && !loading ? (
            <Text style={styles.empty}>
              Nič naplánované. Kŕmenie, čistenie a svetlo nastavíš v sekcii „Plán starostlivosti“.
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingTop: spacing.md, paddingHorizontal: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md },
  error: { color: colors.danger, marginBottom: spacing.sm },
  list: { paddingBottom: spacing.xl, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBadge: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  overdueBadge: { color: colors.danger, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: spacing.xs },
  cardMeta: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  doneButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  doneButtonText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: spacing.xl, lineHeight: 20 },
});
