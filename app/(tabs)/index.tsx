import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { colors, radius, spacing } from '@/constants/theme';
import { CLEANING_TASK_LABELS } from '@/types/database';
import type { CleaningSchedule, FeedingSchedule, Tank } from '@/types/database';
import {
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchTanks,
  logFeedingDone,
  markCleaningDone,
} from '@/lib/queries';

type FeedingItem = { kind: 'feeding'; id: string; schedule: FeedingSchedule; tankName: string };
type CleaningItem = {
  kind: 'cleaning';
  id: string;
  schedule: CleaningSchedule;
  tankName: string;
  overdue: boolean;
};
type AgendaItem = FeedingItem | CleaningItem;

export default function DashboardScreen() {
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tanks, feedings, cleanings] = await Promise.all([
        fetchTanks(),
        fetchFeedingSchedules(),
        fetchCleaningSchedules(),
      ]);
      const tankNameById = new Map<string, string>(tanks.map((t: Tank) => [t.id, t.name]));
      const todayWeekday = new Date().getDay();
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const feedingItems: AgendaItem[] = feedings
        .filter((f) => f.enabled && f.days_of_week.includes(todayWeekday))
        .map((f) => ({
          kind: 'feeding',
          id: `feeding-${f.id}`,
          schedule: f,
          tankName: tankNameById.get(f.tank_id) ?? 'Akvárium',
        }));

      const cleaningItems: AgendaItem[] = cleanings
        .filter((c) => c.enabled && new Date(c.next_due_at) <= endOfToday)
        .map((c) => ({
          kind: 'cleaning',
          id: `cleaning-${c.id}`,
          schedule: c,
          tankName: tankNameById.get(c.tank_id) ?? 'Akvárium',
          overdue: new Date(c.next_due_at) < new Date(new Date().setHours(0, 0, 0, 0)),
        }));

      setItems([...feedingItems, ...cleaningItems]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nepodarilo sa načítať úlohy.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleFeedingDone(item: FeedingItem) {
    await logFeedingDone(item.schedule.tank_id);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  async function handleCleaningDone(item: CleaningItem) {
    await markCleaningDone(item.schedule);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dnešné úlohy</Text>
      <Text style={styles.subtitle}>
        {items.length === 0 ? 'Na dnes nemáš nič naplánované 🎉' : `${items.length} úloh na dnes`}
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.primary} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardBadge}>{item.kind === 'feeding' ? '🐟 Kŕmenie' : '🧽 Čistenie'}</Text>
              {item.kind === 'cleaning' && item.overdue && (
                <Text style={styles.overdueBadge}>Po termíne</Text>
              )}
            </View>
            <Text style={styles.cardTitle}>
              {item.kind === 'feeding'
                ? item.schedule.food_type || 'Kŕmenie rýb'
                : CLEANING_TASK_LABELS[item.schedule.task_type]}
            </Text>
            <Text style={styles.cardMeta}>{item.tankName}</Text>
            {item.kind === 'feeding' && (
              <Text style={styles.cardMeta}>⏰ {item.schedule.time_of_day.slice(0, 5)}</Text>
            )}
            <Pressable
              style={styles.doneButton}
              onPress={() => (item.kind === 'feeding' ? handleFeedingDone(item) : handleCleaningDone(item))}
            >
              <Text style={styles.doneButtonText}>Označiť ako hotové</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              Pridaj akvárium a nastav plán kŕmenia/čistenia v záložke „Plán“.
            </Text>
          ) : null
        }
      />
    </View>
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
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    marginBottom: spacing.sm,
  },
  list: {
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBadge: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  overdueBadge: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  cardMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  doneButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  doneButtonText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  empty: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 20,
  },
});
