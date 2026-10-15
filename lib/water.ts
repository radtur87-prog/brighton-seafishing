import type { WaterParam, WaterTest, WaterType } from '@/types/database';

export type WaterStatus = 'ok' | 'watch' | 'danger';

export interface ParamSpec {
  key: WaterParam;
  label: string;
  unit: string;
  /** Ideal range (inclusive). `null` = unbounded on that side. */
  ok: [number | null, number | null];
  /** Still tolerable range; anything outside is dangerous. */
  watch: [number | null, number | null];
  hint: string;
}

/** Ranges for a typical freshwater community tank (guppies, tetras, platies...). */
export const WATER_PARAMS: ParamSpec[] = [
  { key: 'ph', label: 'pH', unit: '', ok: [6.5, 8.0], watch: [6.0, 8.5], hint: 'Ideál 6,5–8. Guppky znesú aj 7,5–8.' },
  { key: 'temp_c', label: 'Teplota', unit: '°C', ok: [22, 28], watch: [20, 30], hint: 'Tropické ryby 22–28 °C.' },
  { key: 'nh3', label: 'Amoniak NH₃', unit: 'mg/l', ok: [null, 0.05], watch: [null, 0.25], hint: 'Má byť 0. Viac = jed, vymeň 30–50 % vody.' },
  { key: 'no2', label: 'Dusitany NO₂', unit: 'mg/l', ok: [null, 0.1], watch: [null, 0.5], hint: 'Má byť 0. Viac = filter ešte nie je zabehnutý.' },
  { key: 'no3', label: 'Dusičnany NO₃', unit: 'mg/l', ok: [null, 25], watch: [null, 50], hint: 'Pod 25. Vyššie = častejšia výmena vody.' },
  { key: 'gh', label: 'Tvrdosť GH', unit: '°dH', ok: [4, 16], watch: [2, 21], hint: 'Živorodky majú radšej tvrdšiu vodu (8–16).' },
  { key: 'kh', label: 'Uhličitanová KH', unit: '°dH', ok: [3, 12], watch: [1, 18], hint: 'Drží stabilné pH. Pod 3 môže pH náhle padnúť.' },
  { key: 'cl2', label: 'Chlór Cl₂', unit: 'mg/l', ok: [null, 0.05], watch: [null, 0.3], hint: 'Má byť 0. Kohútikovú vodu vždy upravuj kondicionérom.' },
];

export const PARAM_BY_KEY = Object.fromEntries(WATER_PARAMS.map((p) => [p.key, p])) as Record<WaterParam, ParamSpec>;

export const STATUS_LABELS: Record<WaterStatus, string> = {
  ok: 'v poriadku',
  watch: 'pozor',
  danger: 'nebezpečné',
};

const RANK: Record<WaterStatus, number> = { ok: 0, watch: 1, danger: 2 };

function within(value: number, [min, max]: [number | null, number | null]) {
  return (min === null || value >= min) && (max === null || value <= max);
}

export function assessValue(param: WaterParam, value: number): WaterStatus {
  const spec = PARAM_BY_KEY[param];
  if (within(value, spec.ok)) return 'ok';
  if (within(value, spec.watch)) return 'watch';
  return 'danger';
}

/** Our ranges are for freshwater fish; marine tanks are not assessed. */
export function canAssess(waterType: WaterType) {
  return waterType !== 'saltwater';
}

export function worstStatus(statuses: WaterStatus[]): WaterStatus | null {
  if (statuses.length === 0) return null;
  return statuses.reduce((a, b) => (RANK[b] > RANK[a] ? b : a));
}

export interface LatestValue {
  param: WaterParam;
  value: number;
  measured_at: string;
  status: WaterStatus;
}

/** Most recent measured value of every parameter (a test may contain only some of them). */
export function latestValues(tests: WaterTest[]): LatestValue[] {
  const sorted = [...tests].sort((a, b) => b.measured_at.localeCompare(a.measured_at));
  const result: LatestValue[] = [];
  for (const spec of WATER_PARAMS) {
    const test = sorted.find((t) => t[spec.key] !== null && t[spec.key] !== undefined);
    if (!test) continue;
    const value = Number(test[spec.key]);
    result.push({ param: spec.key, value, measured_at: test.measured_at, status: assessValue(spec.key, value) });
  }
  return result;
}

export interface WaterVerdict {
  status: WaterStatus;
  problems: LatestValue[];
  measured_at: string;
}

/** Overall verdict for a tank from the latest values, or null when nothing was measured yet. */
export function waterVerdict(tests: WaterTest[]): WaterVerdict | null {
  const latest = latestValues(tests);
  const status = worstStatus(latest.map((l) => l.status));
  if (!status) return null;
  return {
    status,
    problems: latest.filter((l) => l.status !== 'ok'),
    measured_at: latest.reduce((a, l) => (l.measured_at > a ? l.measured_at : a), latest[0].measured_at),
  };
}

/** Chronological points of one parameter, skipping tests where it was not measured. */
export function seriesFor(tests: WaterTest[], param: WaterParam): { at: string; value: number }[] {
  return tests
    .filter((t) => t[param] !== null && t[param] !== undefined)
    .map((t) => ({ at: t.measured_at, value: Number(t[param]) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** Parses a user-typed number ("7,6" or "7.6"); empty → null, garbage → NaN. */
export function parseMeasurement(input: string): number | null {
  const trimmed = input.trim().replace(',', '.');
  if (!trimmed) return null;
  return /^-?\d+(\.\d+)?$/.test(trimmed) ? Number(trimmed) : NaN;
}

export function formatValue(param: WaterParam, value: number): string {
  const unit = PARAM_BY_KEY[param].unit;
  const text = String(Math.round(value * 100) / 100).replace('.', ',');
  return unit ? `${text} ${unit}` : text;
}
