import {
  addMinutesToTime,
  formatDuration,
  formatTime,
  isDueBy,
  isOverdue,
  lightingOffTime,
  nextDueDate,
  parseTime,
  parseTimeInput,
  toDbTime,
  toExpoWeekday,
} from '@/lib/time';

describe('parse/format time', () => {
  it('parses Postgres time values', () => {
    expect(parseTime('08:05:00')).toEqual({ hour: 8, minute: 5 });
    expect(parseTime('23:59')).toEqual({ hour: 23, minute: 59 });
  });

  it('formats and serialises time of day', () => {
    expect(formatTime({ hour: 7, minute: 3 })).toBe('07:03');
    expect(toDbTime({ hour: 7, minute: 3 })).toBe('07:03:00');
  });

  it('accepts only valid HH:mm input', () => {
    expect(parseTimeInput('9:30')).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeInput(' 21:00 ')).toEqual({ hour: 21, minute: 0 });
    expect(parseTimeInput('24:00')).toBeNull();
    expect(parseTimeInput('12:60')).toBeNull();
    expect(parseTimeInput('')).toBeNull();
    expect(parseTimeInput('abc')).toBeNull();
  });
});

describe('addMinutesToTime', () => {
  it('adds within the same day', () => {
    expect(addMinutesToTime('10:00:00', 8 * 60)).toBe('18:00');
  });

  it('wraps past midnight', () => {
    expect(addMinutesToTime('20:30:00', 6 * 60)).toBe('02:30');
    expect(addMinutesToTime('00:00', 24 * 60)).toBe('00:00');
  });
});

describe('lightingOffTime', () => {
  it('turns off on the same day', () => {
    expect(lightingOffTime('10:00:00', 8 * 60, 3)).toEqual({ weekday: 3, hour: 18, minute: 0 });
  });

  it('moves the off reminder to the next day when it runs past midnight', () => {
    expect(lightingOffTime('20:00:00', 6 * 60, 3)).toEqual({ weekday: 4, hour: 2, minute: 0 });
  });

  it('wraps Saturday to Sunday', () => {
    expect(lightingOffTime('22:00:00', 4 * 60, 6)).toEqual({ weekday: 0, hour: 2, minute: 0 });
  });
});

describe('toExpoWeekday', () => {
  it('maps JS Sunday=0 to expo Sunday=1', () => {
    expect(toExpoWeekday(0)).toBe(1);
    expect(toExpoWeekday(6)).toBe(7);
  });
});

describe('formatDuration', () => {
  it('formats hours and minutes in Slovak', () => {
    expect(formatDuration(480)).toBe('8 h');
    expect(formatDuration(90)).toBe('1 h 30 min');
    expect(formatDuration(45)).toBe('45 min');
  });
});

describe('due dates', () => {
  const now = new Date(2026, 9, 14, 23, 30);

  it('schedules the next task at 09:00 after the interval', () => {
    const due = nextDueDate(now, 7);
    expect(due.getFullYear()).toBe(2026);
    expect(due.getMonth()).toBe(9);
    expect(due.getDate()).toBe(21);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
  });

  it('crosses month boundaries', () => {
    const due = nextDueDate(new Date(2026, 9, 28, 8, 0), 7);
    expect(due.getMonth()).toBe(10);
    expect(due.getDate()).toBe(4);
  });

  it('knows what is due today and what is overdue', () => {
    expect(isDueBy(new Date(2026, 9, 14, 9, 0).toISOString(), now)).toBe(true);
    expect(isDueBy(new Date(2026, 9, 15, 9, 0).toISOString(), now)).toBe(false);
    expect(isOverdue(new Date(2026, 9, 13, 9, 0).toISOString(), now)).toBe(true);
    expect(isOverdue(new Date(2026, 9, 14, 0, 0).toISOString(), now)).toBe(false);
  });
});
