import { buildAgenda } from '@/lib/agenda';
import type { CleaningSchedule, FeedingSchedule, LightingSchedule, Tank } from '@/types/database';

const now = new Date(2026, 9, 14, 12, 0);
const today = now.getDay();
const tomorrow = (today + 1) % 7;

const tank: Tank = {
  id: 't1',
  user_id: 'u1',
  name: 'Obývačka',
  volume_liters: 54,
  water_type: 'freshwater',
  notes: null,
  created_at: now.toISOString(),
};

function feeding(id: string, time: string, days: number[], enabled = true): FeedingSchedule {
  return {
    id,
    tank_id: 't1',
    time_of_day: time,
    days_of_week: days,
    food_type: 'Vločky',
    amount_note: null,
    enabled,
    notification_id: null,
    created_at: now.toISOString(),
  };
}

function cleaning(id: string, due: Date): CleaningSchedule {
  return {
    id,
    tank_id: 't1',
    task_type: 'water_change',
    interval_days: 7,
    last_done_at: null,
    next_due_at: due.toISOString(),
    enabled: true,
    notification_id: null,
    created_at: now.toISOString(),
  };
}

function lighting(id: string, start: string, days: number[]): LightingSchedule {
  return {
    id,
    tank_id: 't1',
    start_time: start,
    duration_minutes: 480,
    days_of_week: days,
    enabled: true,
    notification_on_id: null,
    notification_off_id: null,
    created_at: now.toISOString(),
  };
}

describe('buildAgenda', () => {
  it('shows only today’s enabled feedings that are not done yet, sorted by time', () => {
    const items = buildAgenda(
      now,
      [tank],
      [
        feeding('evening', '18:00:00', [today]),
        feeding('morning', '08:00:00', [today]),
        feeding('done', '12:00:00', [today]),
        feeding('tomorrow', '09:00:00', [tomorrow]),
        feeding('disabled', '10:00:00', [today], false),
      ],
      [],
      [],
      new Set(['done'])
    );
    expect(items.map((i) => i.id)).toEqual(['feeding-morning', 'feeding-evening']);
    expect(items[0].tankName).toBe('Obývačka');
  });

  it('includes due and overdue cleaning, overdue first, future cleaning excluded', () => {
    const items = buildAgenda(
      now,
      [tank],
      [feeding('morning', '08:00:00', [today])],
      [
        cleaning('dueToday', new Date(2026, 9, 14, 9, 0)),
        cleaning('overdue', new Date(2026, 9, 10, 9, 0)),
        cleaning('future', new Date(2026, 9, 20, 9, 0)),
      ],
      [],
      new Set()
    );
    expect(items.map((i) => i.id)).toEqual(['cleaning-overdue', 'feeding-morning', 'cleaning-dueToday']);
    const overdue = items[0];
    expect(overdue.kind === 'cleaning' && overdue.overdue).toBe(true);
  });

  it('places lighting among timed tasks by start time', () => {
    const items = buildAgenda(
      now,
      [tank],
      [feeding('morning', '08:00:00', [today]), feeding('evening', '18:00:00', [today])],
      [],
      [lighting('light', '10:00:00', [today]), lighting('offday', '10:00:00', [tomorrow])],
      new Set()
    );
    expect(items.map((i) => i.id)).toEqual(['feeding-morning', 'lighting-light', 'feeding-evening']);
  });

  it('falls back to a generic tank name for unknown tanks', () => {
    const items = buildAgenda(now, [], [feeding('x', '08:00:00', [today])], [], [], new Set());
    expect(items[0].tankName).toBe('Akvárium');
  });
});
