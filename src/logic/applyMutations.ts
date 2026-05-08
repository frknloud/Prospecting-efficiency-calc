import { PartialStats, StatKey } from '../types';

interface MutationData {
  multiplier?: number;
  flat?: Record<string, number>;
}

export function applyMutation(
  baseStats: Record<string, number | undefined>,
  mutation?: MutationData
): PartialStats {
  const result: PartialStats = {};

  Object.entries(baseStats).forEach(([key, value]) => {
    const statKey = key as StatKey;

    let finalValue = Number(value ?? 0);

    if (mutation?.multiplier) {
      finalValue *= mutation.multiplier;
    }

    if (mutation?.flat?.[statKey]) {
      finalValue += mutation.flat[statKey];
    }

    result[statKey] = finalValue;
  });

  return result;
}
