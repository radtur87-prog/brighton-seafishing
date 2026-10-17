import { greeting, tipOfDay } from '@/lib/greeting';

describe('greeting', () => {
  it('follows the time of day', () => {
    expect(greeting(new Date(2026, 9, 17, 7))).toBe('Dobré ráno');
    expect(greeting(new Date(2026, 9, 17, 13))).toBe('Pekný deň');
    expect(greeting(new Date(2026, 9, 17, 20))).toBe('Dobrý večer');
    expect(greeting(new Date(2026, 9, 17, 23))).toBe('Dobrú noc');
    expect(greeting(new Date(2026, 9, 17, 2))).toBe('Dobrú noc');
  });

  it('gives the same tip all day and a different one tomorrow', () => {
    const morning = tipOfDay(new Date(2026, 9, 17, 6));
    expect(tipOfDay(new Date(2026, 9, 17, 23))).toEqual(morning);
    expect(tipOfDay(new Date(2026, 9, 18, 6))).not.toEqual(morning);
    expect(morning.text.length).toBeGreaterThan(10);
  });
});
