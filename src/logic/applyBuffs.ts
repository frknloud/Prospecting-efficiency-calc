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

      result[statKey] =
        (result[statKey] ?? 0) + Number(value);
    });
  });

  return result;
}
