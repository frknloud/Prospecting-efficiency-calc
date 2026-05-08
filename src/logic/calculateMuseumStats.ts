import museumConfig from '../data/museum-config.json';
import minerals from '../data/museum-minerals.json';
import modifiers from '../data/museum-modifiers.json';

import {
  MuseumMineral,
  MuseumModifier,
  MuseumSlotSelection,
  PartialStats
} from '../types';

import {
  addMuseumContribution,
  slotContribution
} from './applyMuseum';

export function calculateMuseumStats(
  slots: MuseumSlotSelection[]
): PartialStats {
  let multipliers: PartialStats = {};

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
