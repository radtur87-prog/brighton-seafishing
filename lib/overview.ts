import {
  fetchAllFish,
  fetchCleaningSchedules,
  fetchFeedingSchedules,
  fetchFeedingsDoneSince,
  fetchLightingSchedules,
  fetchRecentTaskLogs,
  fetchTanks,
  fetchWaterTests,
} from '@/lib/queries';
import { buildAgenda, type AgendaItem } from '@/lib/agenda';
import { summarizeTanks, type TankSummary } from '@/lib/tankSummary';
import { startOfDay } from '@/lib/time';
import type { CleaningSchedule, Fish, TaskLog, WaterTest } from '@/types/database';

export interface Overview {
  summaries: TankSummary[];
  fish: Fish[];
  logs: TaskLog[];
  agenda: AgendaItem[];
  cleanings: CleaningSchedule[];
  waterTests: WaterTest[];
}

/** Everything the home and tank screens show, fetched in one round-trip batch. */
export async function loadOverview(now = new Date()): Promise<Overview> {
  const [tanks, fish, logs, feedings, cleanings, lightings, done, waterTests] = await Promise.all([
    fetchTanks(),
    fetchAllFish(),
    fetchRecentTaskLogs(500),
    fetchFeedingSchedules(),
    fetchCleaningSchedules(),
    fetchLightingSchedules(),
    fetchFeedingsDoneSince(startOfDay(now)),
    // Water tests are optional: before migration 0004 runs, the rest of the app must still load.
    fetchWaterTests().catch(() => [] as WaterTest[]),
  ]);
  const agenda = buildAgenda(now, tanks, feedings, cleanings, lightings, done);
  return { summaries: summarizeTanks(tanks, fish, logs, agenda, waterTests), fish, logs, agenda, cleanings, waterTests };
}
