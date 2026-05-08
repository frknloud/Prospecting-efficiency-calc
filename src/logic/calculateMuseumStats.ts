import museumConfig from '../data/museum-config.json';
import minerals from '../data/museum-minerals.json';
import modifiers from '../data/museum-modifiers.json';

import {
  MuseumMineral,
  MuseumModifier,
  MuseumSlotSelection,
  PartialStats,
  StatKey
} from '../types';

import {
  addMuseumContribution,
  slotContribution
} from './applyMuseum';

function emptyMuseumMultipliers(): PartialStats {
  return museumConfig.stats.reduce((multipliers, stat) => {
    multipliers[stat as StatKey] = 1;
    return multipliers;
  }, {} as PartialStats);
}

export function calculateMuseumStats(
  slots: MuseumSlotSelection[]
): PartialStats {
  let multipliers: PartialStats = emptyMuseumMultipliers();

  slots.forEach((slot) => {
    if (!slot.mineralId) return;

    const mineral = minerals.find(
      (m) => m.id === slot.mineralId
    ) as MuseumMineral | undefined;

    if (!mineral) return;

    const modifier = modifiers.find(
      (m) => m.id === slot.modifierId
    ) as MuseumModifier | undefined;

    const rarityBonus =
      museumConfig.rarityModifierBonus[slot.rarity] ?? 0;

    const contribution = slotContribution(
      mineral,
      modifier,
      rarityBonus
    );

    multipliers = addMuseumContribution(
      multipliers,
      contribution
    );
  });

  return multipliers;
}
