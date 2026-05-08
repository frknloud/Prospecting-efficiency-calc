import { PartialStats, StatKey, Stats } from '../types';

export const EMPTY_STATS: Stats = {
  luck: 0,
  capacity: 0,
  shakeStrength: 0,
  shakeSpeed: 0,
  digStrength: 0,
  digSpeed: 0,
  sizeBoost: 0,
  modifierBoost: 0,
  sellBoost: 0,
  walkSpeed: 0
};

export interface StatSource {
  stats?: Record<string, number>;
}

export function addStats(
  base: PartialStats,
  addition: Record<string, number> | undefined
): PartialStats {
  const result: PartialStats = { ...base };

  if (!addition) return result;

  Object.entries(addition).forEach(([key, value]) => {
    const statKey = key as StatKey;

    if (statKey in EMPTY_STATS) {
      result[statKey] = (result[statKey] ?? 0) + value;
    }
  });

  return result;
}

export function calculateStats(
  sources: Array<StatSource | null | undefined>,
  museumStats: PartialStats = {}
): Stats {
  let totals: PartialStats = { ...EMPTY_STATS };

  sources.forEach((source) => {
    totals = addStats(totals, source?.stats);
  });

  totals = addStats(totals, museumStats);

  return {
    ...EMPTY_STATS,
    ...totals
  };
}
