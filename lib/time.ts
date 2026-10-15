export interface TimeOfDay {
  hour: number;
  minute: number;
}

const MINUTES_PER_DAY = 24 * 60;
const DEFAULT_DUE_HOUR = 9;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Parses 'HH:mm' or 'HH:mm:ss' (as stored by Postgres `time`). */
export function parseTime(time: string): TimeOfDay {
  const [h, m] = time.split(':').map(Number);
  return { hour: h, minute: m };
}

export function formatTime({ hour, minute }: TimeOfDay): string {
  return `${pad(hour)}:${pad(minute)}`;
}

export function toDbTime(t: TimeOfDay): string {
  return `${formatTime(t)}:00`;
}

/** Strict parser for user-typed 'HH:mm'; returns null when invalid. */
export function parseTimeInput(input: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(input.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}

export function addMinutesToTime(time: string, minutes: number): string {
  const { hour, minute } = parseTime(time);
  const total = (((hour * 60 + minute + minutes) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return formatTime({ hour: Math.floor(total / 60), minute: total % 60 });
}

/**
 * When the light should switch off, as a weekday + time.
 * A duration that runs past midnight moves the off-time to the following day.
 */
export function lightingOffTime(
  startTime: string,
  durationMinutes: number,
  startWeekday: number
): { weekday: number } & TimeOfDay {
  const { hour, minute } = parseTime(startTime);
  const end = hour * 60 + minute + durationMinutes;
  const dayOffset = Math.floor(end / MINUTES_PER_DAY);
  const endOfDay = end % MINUTES_PER_DAY;
  return {
    weekday: (startWeekday + dayOffset) % 7,
    hour: Math.floor(endOfDay / 60),
    minute: endOfDay % 60,
  };
}

/** JS Date.getDay() is 0=Sunday..6=Saturday; expo-notifications WEEKLY uses 1=Sunday..7=Saturday. */
export function toExpoWeekday(jsWeekday: number): number {
  return jsWeekday + 1;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Next due date for a recurring task: `intervalDays` after `from`, at 09:00 local time. */
export function nextDueDate(from: Date, intervalDays: number): Date {
  const due = new Date(from);
  due.setDate(due.getDate() + intervalDays);
  due.setHours(DEFAULT_DUE_HOUR, 0, 0, 0);
  return due;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function isDueBy(dueAt: string, date: Date): boolean {
  return new Date(dueAt) <= endOfDay(date);
}

/** Slovak plural: forms for 1, 2–4 and 5+ (e.g. mesiac / mesiace / mesiacov). */
export function plural(n: number, one: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n >= 2 && n <= 4) return few;
  return many;
}

const MS_PER_DAY = 86_400_000;

function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/** Parses 'YYYY-MM-DD' as a local date (not UTC midnight). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toLocalDateString(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Age of a tank since its start date, e.g. "12 dní", "7 mesiacov", "1 rok 2 mesiace". */
export function tankAge(startedAt: string, now: Date): string {
  const start = parseLocalDate(startedAt);
  const days = calendarDaysBetween(start, now);
  if (days < 0) return 'ešte nezaložené';
  let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (now.getDate() < start.getDate()) months -= 1;
  if (months < 1) return `${days} ${plural(days, 'deň', 'dni', 'dní')}`;
  if (months < 12) return `${months} ${plural(months, 'mesiac', 'mesiace', 'mesiacov')}`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const yearText = `${years} ${plural(years, 'rok', 'roky', 'rokov')}`;
  return rest === 0 ? yearText : `${yearText} ${rest} ${plural(rest, 'mesiac', 'mesiace', 'mesiacov')}`;
}

/** "dnes", "včera", "pred 3 dňami", "pred 2 mesiacmi". */
export function timeAgo(iso: string, now: Date): string {
  const days = calendarDaysBetween(new Date(iso), now);
  if (days <= 0) return 'dnes';
  if (days === 1) return 'včera';
  if (days < 30) return `pred ${days} dňami`;
  const months = Math.floor(days / 30);
  return months === 1 ? 'pred mesiacom' : `pred ${months} mesiacmi`;
}

export function daysSince(iso: string, now: Date): number {
  return calendarDaysBetween(new Date(iso), now);
}

export function isOverdue(dueAt: string, date: Date): boolean {
  return new Date(dueAt) < startOfDay(date);
}
