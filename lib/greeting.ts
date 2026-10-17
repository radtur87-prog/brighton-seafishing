import { TIPS } from '@/constants/knowledge';

export function greeting(now: Date): string {
  const h = now.getHours();
  if (h >= 4 && h < 10) return 'Dobré ráno';
  if (h >= 10 && h < 18) return 'Pekný deň';
  if (h >= 18 && h < 22) return 'Dobrý večer';
  return 'Dobrú noc';
}

const ALL_TIPS = TIPS.flatMap((group) => group.points.map((text) => ({ emoji: group.emoji, topic: group.title, text })));

/** One tip per calendar day, cycling through every tip in the Tips section. */
export function tipOfDay(now: Date) {
  const day = Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000);
  return ALL_TIPS[day % ALL_TIPS.length];
}
