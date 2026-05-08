import { PartialStats, StatKey } from '../types';

interface EnchantData {
  multiplier?: Record<string, number | undefined>;
  flat?: Record<string, number | undefined>;
  [key: string]: unknown;
}

export function applyEnchant(
  baseStats: Record<string, number | undefined>,
  enchant?: EnchantData
): PartialStats {
  const result: PartialStats = {};

  Object.entries(baseStats).forEach(([key, value]) => {
    const statKey = key as StatKey;
    result[statKey] = Number(value ?? 0);
  });

  if (!enchant) {
    return result;
  }

  Object.entries(enchant.multiplier ?? {}).forEach(([key, multiplier]) => {
    const statKey = key as StatKey;
    result[statKey] =
      Number(result[statKey] ?? 0) * Number(multiplier ?? 1);
  });

  Object.entries(enchant.flat ?? {}).forEach(([key, flat]) => {
    const statKey = key as StatKey;
    result[statKey] =
      Number(result[statKey] ?? 0) + Number(flat ?? 0);
  });

  return result;
}
