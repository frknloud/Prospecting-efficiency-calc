import {
  MuseumMineral,
  MuseumModifier,
  PartialStats,
  StatKey,
  Stats
} from '../types';

export function slotContribution(
  mineral: MuseumMineral,
  modifier: MuseumModifier | undefined,
  rarityBonus: number
): PartialStats {
  const contribution: PartialStats = {
    ...mineral.stats
  };

  if (!modifier) {
    return contribution;
  }

  const modifierBonus = rarityBonus * (modifier.isDouble ? 2 : 1);

  modifier.affects.forEach((statKey) => {
    contribution[statKey] =
      (contribution[statKey] ?? 0) + modifierBonus;
  });

  return contribution;
}

export function addMuseumContribution(
  multipliers: PartialStats,
  contribution: PartialStats
): PartialStats {
  const result: PartialStats = {
    ...multipliers
  };

  Object.entries(contribution).forEach(([key, value]) => {
    const statKey = key as StatKey;

    result[statKey] =
      (result[statKey] ?? 1) + Number(value ?? 0);
  });

  return result;
}

export function applyMuseum(
  stats: Stats,
  multipliers: PartialStats
): Stats {
  const result: Stats = {
    ...stats
  };

  Object.entries(multipliers).forEach(([key, multiplier]) => {
    const statKey = key as StatKey;

    if (result[statKey] !== undefined) {
      result[statKey] =
        Number(result[statKey]) * Number(multiplier ?? 1);
    }
  });

  return result;
}
