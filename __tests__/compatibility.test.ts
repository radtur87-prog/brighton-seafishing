import { findSpecies, searchSpecies, SPECIES, SPECIES_BY_ID } from '@/constants/species';
import { bioload, checkCompatibility, resolveStock, type StockEntry } from '@/lib/compatibility';
import type { Fish } from '@/types/database';

const tank = { volume_liters: 40, water_type: 'freshwater' as const };
const e = (id: string, count: number): StockEntry => ({ species: SPECIES_BY_ID[id], count });
const fish = (species: string, count: number): Fish => ({
  id: species,
  tank_id: 't1',
  species,
  nickname: null,
  color: null,
  count,
  added_at: '',
});

describe('species lookup', () => {
  it('matches what people type, with or without diacritics', () => {
    expect(findSpecies('Guppy')?.id).toBe('guppy');
    expect(findSpecies('gupky samce')?.id).toBe('guppy');
    expect(findSpecies('Neónky')?.id).toBe('neon');
    expect(findSpecies('Corydoras aeneus')?.id).toBe('coryaeneus');
    expect(findSpecies('Bojovnica pestrá')?.id).toBe('betta');
    expect(findSpecies('Živorodka dúhová (Guppy)')?.id).toBe('guppy');
    expect(findSpecies('niečo iné')).toBeNull();
  });

  it('searches names, latin names and aliases', () => {
    expect(searchSpecies('kreve').map((s) => s.id)).toEqual(['neocaridina']);
    expect(searchSpecies('paracheirodon').map((s) => s.id)).toEqual(['neon', 'cardinal']);
    expect(searchSpecies('')).toHaveLength(SPECIES.length);
  });

  it('has sane data for every species', () => {
    for (const s of SPECIES) {
      expect(s.temp[0]).toBeLessThan(s.temp[1]);
      expect(s.ph[0]).toBeLessThan(s.ph[1]);
      expect(s.gh[0]).toBeLessThan(s.gh[1]);
      expect(s.minGroup).toBeGreaterThanOrEqual(1);
    }
    expect(new Set(SPECIES.map((s) => s.id)).size).toBe(SPECIES.length);
  });
});

describe('checkCompatibility', () => {
  it('accepts a classic guppy + corydoras community', () => {
    expect(checkCompatibility([e('guppy', 5), e('corypaleatus', 6)], { ...tank, volume_liters: 60 })).toEqual([]);
  });

  it('flags temperature conflicts, predators and fin nippers', () => {
    const texts = checkCompatibility([e('goldfish', 2), e('neon', 8), e('angelfish', 1), e('tigerbarb', 6)], {
      volume_liters: 300,
      water_type: 'freshwater',
    }).map((i) => `${i.level}: ${i.text}`);
    expect(texts.some((t) => t.startsWith('danger: Karas zlatý (16–22 °C) a Skalára (24–30 °C)'))).toBe(true);
    expect(texts).toContain('danger: Skalára môže zjesť Neónka obyčajná.');
    expect(texts).toContain('watch: Parmička sumatranská okusuje plutvy – Skalára má dlhé plutvy.');
    // dangers are listed first
    expect(texts[0].startsWith('danger')).toBe(true);
  });

  it('warns about small groups, small tanks, two bettas and water outside the range', () => {
    const issues = checkCompatibility([e('neon', 3), e('betta', 2)], tank, [
      { param: 'ph', value: 7.8, measured_at: '', status: 'ok' },
    ]).map((i) => i.text);
    expect(issues).toContain('Neónka obyčajná žije v skupine – chovaj aspoň 8 ks (teraz 3).');
    expect(issues).toContain('Neónka obyčajná potrebuje aspoň 54 l (máš 40 l).');
    expect(issues).toContain('2× Bojovnica pestrá – dva samce sa pobijú. Nechaj len jedného samca.');
    expect(issues).toContain('pH 7,8 je mimo rozsahu pre Neónka obyčajná (5–7,5).');
  });

  it('betta harasses guppies; big fish hunt shrimp', () => {
    const texts = checkCompatibility([e('betta', 1), e('guppy', 3), e('pearlgourami', 1), e('neocaridina', 10)], {
      volume_liters: 120,
      water_type: 'freshwater',
    }).map((i) => i.text);
    expect(texts).toContain('Bojovnica pestrá napáda ryby s dlhými plutvami ako Živorodka dúhová.');
    expect(texts).toContain('Gurama perlová môže loviť Krevetka Neocaridina, hlavne mláďatá.');
  });

  it('rejects freshwater species in a marine tank', () => {
    expect(checkCompatibility([e('guppy', 3)], { volume_liters: 100, water_type: 'saltwater' })[0].level).toBe('danger');
  });
});

describe('bioload', () => {
  it('uses 1 cm of adult fish per litre and counts unknown fish as 5 cm', () => {
    const { entries, unknown } = resolveStock([fish('Guppy', 4), fish('neónky', 2), fish('Záhadná ryba', 1)]);
    expect(entries.map((x) => [x.species.id, x.count])).toEqual([
      ['guppy', 4],
      ['neon', 2],
    ]);
    expect(unknown).toHaveLength(1);
    const load = bioload(entries, unknown, 40);
    expect(load).toEqual({ cm: 33, percent: 83, status: 'watch', unknownCount: 1 });
    expect(bioload(entries, unknown, null).percent).toBeNull();
    expect(bioload(entries, [], 100).status).toBe('ok');
  });

  it('merges rows of the same species', () => {
    const { entries } = resolveStock([fish('Guppy', 2), fish('gupky', 3)]);
    expect(entries).toHaveLength(1);
    expect(entries[0].count).toBe(5);
  });
});
