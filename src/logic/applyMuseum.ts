import {
  MuseumMineral,
  MuseumModifier,
  PartialStats,
  StatKey
} from '../types';

export function applyMuseumModifier(
  mineral: MuseumMineral,
  modifier: MuseumModifier | undefined,
  rarityBonus: number
): PartialStats {
  const finalStats: PartialStats = {};

  Object.entries(mineral.stats).forEach(([key, value]) => {
    const statKey = key as StatKey;

    let modifiedValue = value ?? 0;

    if (modifier?.affects.includes(statKey)) {
      modifiedValue += rarityBonus;

      if (modifier.isDouble) {
        modifiedValue *= 2;
      }
    }

    finalStats[statKey] = modifiedValue;
  });

  return finalStats;
}
