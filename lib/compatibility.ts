import { findSpecies, type Species } from '@/constants/species';
import type { LatestValue, WaterStatus } from '@/lib/water';
import type { Fish, Tank } from '@/types/database';

export interface StockEntry {
  species: Species;
  count: number;
}

export interface CompatIssue {
  level: Exclude<WaterStatus, 'ok'>;
  text: string;
}

/** Fish without an encyclopedia match count as this length for the bioload estimate. */
export const UNKNOWN_FISH_CM = 5;

const short = (s: Species) => s.name.replace(/\s*\(.*\)$/, '');
const range = ([a, b]: [number, number], unit = '') => `${String(a).replace('.', ',')}–${String(b).replace('.', ',')}${unit}`;
const overlaps = (a: [number, number], b: [number, number]) => Math.min(a[1], b[1]) >= Math.max(a[0], b[0]);

/** Groups a tank's fish rows by encyclopedia species; unknown species are returned separately. */
export function resolveStock(fish: Fish[]): { entries: StockEntry[]; unknown: Fish[] } {
  const bySpecies = new Map<string, StockEntry>();
  const unknown: Fish[] = [];
  for (const f of fish) {
    const species = findSpecies(f.species);
    if (!species) {
      unknown.push(f);
      continue;
    }
    const entry = bySpecies.get(species.id);
    if (entry) entry.count += f.count;
    else bySpecies.set(species.id, { species, count: f.count });
  }
  return { entries: [...bySpecies.values()], unknown };
}

/** Every problem between the species, their numbers, the tank and the latest water values. */
export function checkCompatibility(
  entries: StockEntry[],
  tank: Pick<Tank, 'volume_liters' | 'water_type'>,
  water: LatestValue[] = []
): CompatIssue[] {
  const issues: CompatIssue[] = [];
  if (entries.length === 0) return issues;

  if (tank.water_type === 'saltwater') {
    issues.push({ level: 'danger', text: 'Toto sú sladkovodné druhy – do morského akvária nepatria.' });
    return issues;
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const [a, b] = [entries[i].species, entries[j].species];
      if (!overlaps(a.temp, b.temp)) {
        issues.push({
          level: 'danger',
          text: `${short(a)} (${range(a.temp, ' °C')}) a ${short(b)} (${range(b.temp, ' °C')}) potrebujú inú teplotu.`,
        });
      }
      if (!overlaps(a.ph, b.ph)) {
        issues.push({ level: 'watch', text: `${short(a)} (pH ${range(a.ph)}) a ${short(b)} (pH ${range(b.ph)}) majú radi iné pH.` });
      }
      for (const [x, y] of [
        [a, b],
        [b, a],
      ]) {
        if (x.temperament === 'aggressive') {
          issues.push({ level: 'danger', text: `${short(x)} je agresívna a môže napadnúť ${short(y)}.` });
        }
        if (x.preyMaxCm && y.sizeCm <= x.preyMaxCm) {
          issues.push({ level: 'danger', text: `${short(x)} môže zjesť ${short(y)}.` });
        }
        if (x.finNipper && y.longFins) {
          issues.push({ level: 'watch', text: `${short(x)} okusuje plutvy – ${short(y)} má dlhé plutvy.` });
        }
        if (x.attacksLongFins && y.longFins && !y.oneMalePerTank) {
          issues.push({ level: 'watch', text: `${short(x)} napáda ryby s dlhými plutvami ako ${short(y)}.` });
        }
        if (y.invertebrate && !x.invertebrate && !x.shrimpSafe && !x.preyMaxCm && x.sizeCm >= 8) {
          issues.push({ level: 'watch', text: `${short(x)} môže loviť ${short(y)}, hlavne mláďatá.` });
        }
      }
    }
  }

  for (const { species, count } of entries) {
    if (species.oneMalePerTank && count > 1) {
      issues.push({ level: 'danger', text: `${count}× ${short(species)} – dva samce sa pobijú. Nechaj len jedného samca.` });
    }
    if (count < species.minGroup) {
      issues.push({
        level: 'watch',
        text: `${short(species)} žije v skupine – chovaj aspoň ${species.minGroup} ks (teraz ${count}).`,
      });
    }
    if (tank.volume_liters && tank.volume_liters < species.minLiters) {
      issues.push({ level: 'watch', text: `${short(species)} potrebuje aspoň ${species.minLiters} l (máš ${tank.volume_liters} l).` });
    }
    for (const w of water) {
      const limits = w.param === 'temp_c' ? species.temp : w.param === 'ph' ? species.ph : w.param === 'gh' ? species.gh : null;
      if (!limits || (w.value >= limits[0] && w.value <= limits[1])) continue;
      const label = w.param === 'temp_c' ? 'Teplota' : w.param === 'ph' ? 'pH' : 'GH';
      const unit = w.param === 'temp_c' ? ' °C' : w.param === 'gh' ? ' °dH' : '';
      issues.push({
        level: 'watch',
        text: `${label} ${String(w.value).replace('.', ',')}${unit} je mimo rozsahu pre ${short(species)} (${range(limits, unit)}).`,
      });
    }
  }

  // Same sentence can come from both directions of a pair (e.g. two aggressive species).
  const seen = new Set<string>();
  return issues
    .filter((i) => (seen.has(i.text) ? false : (seen.add(i.text), true)))
    .sort((a, b) => (a.level === b.level ? 0 : a.level === 'danger' ? -1 : 1));
}

export interface Bioload {
  /** Sum of adult fish lengths (cm). */
  cm: number;
  /** Percent of the "1 cm of fish per 1 litre" rule; null without a volume. */
  percent: number | null;
  status: WaterStatus | null;
  unknownCount: number;
}

/** Stocking level by the classic rule of thumb: 1 cm of adult fish per litre of water. */
export function bioload(entries: StockEntry[], unknown: Fish[], liters: number | null): Bioload {
  const unknownCount = unknown.reduce((sum, f) => sum + f.count, 0);
  const cm =
    entries.reduce((sum, e) => sum + (e.species.bioloadCm ?? e.species.sizeCm) * e.count, 0) + unknownCount * UNKNOWN_FISH_CM;
  const rounded = Math.round(cm * 10) / 10;
  if (!liters) return { cm: rounded, percent: null, status: null, unknownCount };
  const percent = Math.round((cm / liters) * 100);
  return { cm: rounded, percent, status: percent <= 80 ? 'ok' : percent <= 100 ? 'watch' : 'danger', unknownCount };
}
