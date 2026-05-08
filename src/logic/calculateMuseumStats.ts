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

import { applyMuseumModifier } from './applyMuseum';

export function calculateMuseumStats(
  slots: MuseumSlotSelection[]
): PartialStats {
  const totals: PartialStats = {};

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

    const modifiedStats = applyMuseumModifier(
      mineral,
      modifier,
      rarityBonus
    );

    Object.entries(modifiedStats).forEach(([key, value]) => {
      const statKey = key as StatKey;

      totals[statKey] = (totals[statKey] ?? 0) + (value ?? 0);
    });
  });

  return totals;
}
