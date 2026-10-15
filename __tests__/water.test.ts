import {
  assessValue,
  formatValue,
  latestValues,
  parseMeasurement,
  seriesFor,
  waterVerdict,
} from '@/lib/water';
import { summarizeTanks } from '@/lib/tankSummary';
import type { Tank, WaterTest } from '@/types/database';

function test_(id: string, measured_at: string, values: Partial<WaterTest>): WaterTest {
  return {
    id,
    tank_id: 't1',
    measured_at,
    ph: null,
    gh: null,
    kh: null,
    nh3: null,
    no2: null,
    no3: null,
    cl2: null,
    temp_c: null,
    note: null,
    created_at: measured_at,
    ...values,
  };
}

describe('assessValue', () => {
  it('grades pH into ok / watch / danger', () => {
    expect(assessValue('ph', 7.6)).toBe('ok');
    expect(assessValue('ph', 8.0)).toBe('ok');
    expect(assessValue('ph', 8.3)).toBe('watch');
    expect(assessValue('ph', 6.2)).toBe('watch');
    expect(assessValue('ph', 9)).toBe('danger');
    expect(assessValue('ph', 5.5)).toBe('danger');
  });

  it('treats any real ammonia or nitrite as a problem', () => {
    expect(assessValue('nh3', 0)).toBe('ok');
    expect(assessValue('nh3', 0.25)).toBe('watch');
    expect(assessValue('nh3', 0.5)).toBe('danger');
    expect(assessValue('no2', 1)).toBe('danger');
    expect(assessValue('no3', 40)).toBe('watch');
    expect(assessValue('cl2', 0.8)).toBe('danger');
  });
});

describe('latest values and verdict', () => {
  const tests = [
    test_('a', '2026-10-01T10:00:00Z', { ph: 7.2, no3: 10, temp_c: 25 }),
    test_('b', '2026-10-10T10:00:00Z', { ph: 7.8, nh3: 0.5 }),
  ];

  it('takes each parameter from the newest test that measured it', () => {
    const latest = latestValues(tests);
    expect(latest.map((l) => [l.param, l.value])).toEqual([
      ['ph', 7.8],
      ['temp_c', 25],
      ['nh3', 0.5],
      ['no3', 10],
    ]);
  });

  it('reports the worst status with the offending values', () => {
    const verdict = waterVerdict(tests)!;
    expect(verdict.status).toBe('danger');
    expect(verdict.problems.map((p) => p.param)).toEqual(['nh3']);
    expect(verdict.measured_at).toBe('2026-10-10T10:00:00Z');
    expect(waterVerdict([])).toBeNull();
  });

  it('builds a chronological series skipping missing values', () => {
    expect(seriesFor([tests[1], tests[0]], 'ph').map((p) => p.value)).toEqual([7.2, 7.8]);
    expect(seriesFor(tests, 'no3')).toHaveLength(1);
  });

  it('does not grade marine tanks with freshwater ranges', () => {
    const base = { user_id: 'u', volume_liters: 40, notes: null, photo_path: null, started_at: null, created_at: '' };
    const tanks: Tank[] = [
      { ...base, id: 't1', name: 'Sladká', water_type: 'freshwater' },
      { ...base, id: 't2', name: 'Morská', water_type: 'saltwater' },
    ];
    const marine = test_('m', '2026-10-10T10:00:00Z', { ph: 8.2 });
    const [fresh, salt] = summarizeTanks(tanks, [], [], [], [...tests, { ...marine, tank_id: 't2' }]);
    expect(fresh.water?.status).toBe('danger');
    expect(salt.water).toBeNull();
  });
});

describe('input and formatting', () => {
  it('parses Slovak decimal commas and rejects garbage', () => {
    expect(parseMeasurement('7,6')).toBe(7.6);
    expect(parseMeasurement(' 25 ')).toBe(25);
    expect(parseMeasurement('')).toBeNull();
    expect(parseMeasurement('abc')).toBeNaN();
  });

  it('formats with unit and comma', () => {
    expect(formatValue('ph', 7.6)).toBe('7,6');
    expect(formatValue('temp_c', 25)).toBe('25 °C');
    expect(formatValue('no3', 12.345)).toBe('12,35 mg/l');
  });
});
