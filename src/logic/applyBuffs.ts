import { PartialStats, StatKey, Stats } from '../types';

export function applyBuffs(
  baseStats: Stats,
  enabledBuffs: Array<Record<string, any>>
): Stats {
  const result: Stats = {
    ...baseStats
  };

  enabledBuffs.forEach((buff) => {
    Object.entries(buff.stats ?? {}).forEach(([key, value]) => {
      const statKey = key as StatKey;

      if (result[statKey] !== undefined) {
        result[statKey] =
          Number(result[statKey]) * (1 + Number(value));
      }
    });
  });

  return result;
}
