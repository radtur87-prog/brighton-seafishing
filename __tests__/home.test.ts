import { plural, tankAge, timeAgo } from '@/lib/time';
import { summarizeTanks } from '@/lib/tankSummary';
import type { AgendaItem } from '@/lib/agenda';
import type { Fish, Tank, TaskLog } from '@/types/database';

const now = new Date(2026, 9, 15, 10, 0);

describe('Slovak plural and ages', () => {
  it('picks the right plural form', () => {
    expect(plural(1, 'mesiac', 'mesiace', 'mesiacov')).toBe('mesiac');
    expect(plural(3, 'mesiac', 'mesiace', 'mesiacov')).toBe('mesiace');
    expect(plural(7, 'mesiac', 'mesiace', 'mesiacov')).toBe('mesiacov');
    expect(plural(0, 'ryba', 'ryby', 'rýb')).toBe('rýb');
  });

  it('formats tank age from the start date', () => {
    expect(tankAge('2026-10-15', now)).toBe('0 dní');
    expect(tankAge('2026-10-14', now)).toBe('1 deň');
    expect(tankAge('2026-10-03', now)).toBe('12 dní');
    expect(tankAge('2026-09-15', now)).toBe('1 mesiac');
    expect(tankAge('2026-09-16', now)).toBe('29 dní');
    expect(tankAge('2026-03-15', now)).toBe('7 mesiacov');
    expect(tankAge('2025-10-15', now)).toBe('1 rok');
    expect(tankAge('2024-08-01', now)).toBe('2 roky 2 mesiace');
    expect(tankAge('2026-12-01', now)).toBe('ešte nezaložené');
  });

  it('describes how long ago something happened', () => {
    expect(timeAgo(new Date(2026, 9, 15, 8).toISOString(), now)).toBe('dnes');
    expect(timeAgo(new Date(2026, 9, 14, 23).toISOString(), now)).toBe('včera');
    expect(timeAgo(new Date(2026, 9, 12, 9).toISOString(), now)).toBe('pred 3 dňami');
    expect(timeAgo(new Date(2026, 8, 10, 9).toISOString(), now)).toBe('pred mesiacom');
    expect(timeAgo(new Date(2026, 6, 1, 9).toISOString(), now)).toBe('pred 3 mesiacmi');
  });
});

describe('summarizeTanks', () => {
  const tank = (id: string): Tank => ({
    id,
    user_id: 'u',
    name: id,
    volume_liters: 40,
    water_type: 'freshwater',
    notes: null,
    photo_path: null,
    started_at: null,
    created_at: now.toISOString(),
  });
  const fish = (tank_id: string, species: string, count: number): Fish => ({
    id: `${tank_id}-${species}`,
    tank_id,
    species,
    nickname: null,
    color: null,
    count,
    added_at: now.toISOString(),
  });
  const log = (tank_id: string, task_type: string, done_at: string): TaskLog => ({
    id: `${tank_id}-${task_type}-${done_at}`,
    tank_id,
    task_type,
    done_at,
    note: null,
  });

  it('counts fish, groups species and finds the latest maintenance per tank', () => {
    const [a, b] = summarizeTanks(
      [tank('a'), tank('b')],
      [fish('a', 'Neón', 4), fish('a', 'Guppy', 6), fish('b', 'Guppy', 2)],
      [
        log('a', 'water_change', '2026-10-01T10:00:00.000Z'),
        log('a', 'water_change', '2026-10-10T10:00:00.000Z'),
        log('b', 'filter_clean', '2026-10-05T10:00:00.000Z'),
      ],
      [
        { kind: 'feeding', id: 'f', sortKey: '08:00', tankName: 'a', schedule: { tank_id: 'a' } },
        { kind: 'lighting', id: 'l', sortKey: '10:00', tankName: 'a', schedule: { tank_id: 'a' } },
      ] as unknown as AgendaItem[]
    );
    expect(a.fishTotal).toBe(10);
    expect(a.stock).toEqual(['6× Guppy', '4× Neón']);
    expect(a.lastWaterChange).toBe('2026-10-10T10:00:00.000Z');
    expect(a.lastFilterClean).toBeNull();
    expect(a.todoToday).toBe(1);
    expect(b.fishTotal).toBe(2);
    expect(b.lastFilterClean).toBe('2026-10-05T10:00:00.000Z');
    expect(b.todoToday).toBe(0);
  });
});
