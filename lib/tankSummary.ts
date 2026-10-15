import type { AgendaItem } from '@/lib/agenda';
import { canAssess, waterVerdict, type WaterVerdict } from '@/lib/water';
import type { Fish, Tank, TaskLog, WaterTest } from '@/types/database';

export interface TankSummary {
  tank: Tank;
  fishTotal: number;
  /** Species with counts, largest group first, e.g. "6× Guppy". */
  stock: string[];
  lastWaterChange: string | null;
  lastFilterClean: string | null;
  todoToday: number;
  /** Latest water verdict; null when never measured or not assessable (marine). */
  water: WaterVerdict | null;
}

function lastLog(logs: TaskLog[], tankId: string, type: string): string | null {
  let latest: string | null = null;
  for (const log of logs) {
    if (log.tank_id === tankId && log.task_type === type && (!latest || log.done_at > latest)) latest = log.done_at;
  }
  return latest;
}

export function summarizeTanks(
  tanks: Tank[],
  fish: Fish[],
  logs: TaskLog[],
  agenda: AgendaItem[],
  waterTests: WaterTest[] = []
): TankSummary[] {
  return tanks.map((tank) => {
    const own = fish.filter((f) => f.tank_id === tank.id);
    const bySpecies = new Map<string, number>();
    for (const f of own) bySpecies.set(f.species, (bySpecies.get(f.species) ?? 0) + f.count);
    const stock = [...bySpecies.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([species, count]) => `${count}× ${species}`);

    return {
      tank,
      fishTotal: own.reduce((sum, f) => sum + f.count, 0),
      stock,
      lastWaterChange: lastLog(logs, tank.id, 'water_change'),
      lastFilterClean: lastLog(logs, tank.id, 'filter_clean'),
      todoToday: agenda.filter((i) => i.kind !== 'lighting' && i.schedule.tank_id === tank.id).length,
      water: canAssess(tank.water_type) ? waterVerdict(waterTests.filter((t) => t.tank_id === tank.id)) : null,
    };
  });
}
