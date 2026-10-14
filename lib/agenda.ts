import type { CleaningSchedule, FeedingSchedule, LightingSchedule, Tank } from '@/types/database';
import { isDueBy, isOverdue } from '@/lib/time';

export type AgendaItem =
  | { kind: 'feeding'; id: string; sortKey: string; schedule: FeedingSchedule; tankName: string }
  | { kind: 'lighting'; id: string; sortKey: string; schedule: LightingSchedule; tankName: string }
  | { kind: 'cleaning'; id: string; sortKey: string; schedule: CleaningSchedule; tankName: string; overdue: boolean };

export const BADGES: Record<AgendaItem['kind'], string> = {
  feeding: '🐟 Kŕmenie',
  lighting: '💡 Osvetlenie',
  cleaning: '🧽 Údržba',
};

export function buildAgenda(
  now: Date,
  tanks: Tank[],
  feedings: FeedingSchedule[],
  cleanings: CleaningSchedule[],
  lightings: LightingSchedule[],
  feedingsDoneToday: Set<string>
): AgendaItem[] {
  const tankName = (id: string) => tanks.find((t) => t.id === id)?.name ?? 'Akvárium';
  const weekday = now.getDay();

  const items: AgendaItem[] = [
    ...feedings
      .filter((f) => f.enabled && f.days_of_week.includes(weekday) && !feedingsDoneToday.has(f.id))
      .map((f) => ({
        kind: 'feeding' as const,
        id: `feeding-${f.id}`,
        sortKey: f.time_of_day,
        schedule: f,
        tankName: tankName(f.tank_id),
      })),
    ...lightings
      .filter((l) => l.enabled && l.days_of_week.includes(weekday))
      .map((l) => ({
        kind: 'lighting' as const,
        id: `lighting-${l.id}`,
        sortKey: l.start_time,
        schedule: l,
        tankName: tankName(l.tank_id),
      })),
    ...cleanings
      .filter((c) => c.enabled && isDueBy(c.next_due_at, now))
      .map((c) => ({
        kind: 'cleaning' as const,
        id: `cleaning-${c.id}`,
        // Overdue maintenance first, then the rest after timed tasks.
        sortKey: isOverdue(c.next_due_at, now) ? '00:00' : '99:99',
        schedule: c,
        tankName: tankName(c.tank_id),
        overdue: isOverdue(c.next_due_at, now),
      })),
  ];

  return items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
}
