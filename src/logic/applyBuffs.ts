import { PartialStats, StatKey } from '../types';

export function applyBuffs(
  baseStats: PartialStats,
  enabledBuffs: Array<Record<string, any>>
): PartialStats {
  const result: PartialStats = {
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
