import {
  fetchAllFish,
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchFeedingsDoneSince,
  fetchLightingSchedules,
  fetchRecentTaskLogs,
  fetchTanks,
} from '@/lib/queries';
import { buildAgenda, type AgendaItem } from '@/lib/agenda';
import { summarizeTanks, type TankSummary } from '@/lib/tankSummary';
import { startOfDay } from '@/lib/time';
import type { CleaningSchedule, Fish, TaskLog } from '@/types/database';

export interface Overview {
  summaries: TankSummary[];
  fish: Fish[];
  logs: TaskLog[];
  agenda: AgendaItem[];
  cleanings: CleaningSchedule[];
}

/** Everything the home and tank screens show, fetched in one round-trip batch. */
export async function loadOverview(now = new Date()): Promise<Overview> {
  const [tanks, fish, logs, feedings, cleanings, lightings, done] = await Promise.all([
    fetchTanks(),
    fetchAllFish(),
    fetchRecentTaskLogs(500),
    fetchFeedingSchedules(),
    fetchCleaningSchedules(),
    fetchLightingSchedules(),
    fetchFeedingsDoneSince(startOfDay(now)),
  ]);
  const agenda = buildAgenda(now, tanks, feedings, cleanings, lightings, done);
  return { summaries: summarizeTanks(tanks, fish, logs, agenda), fish, logs, agenda, cleanings };
}
