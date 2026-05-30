import museumMinerals from "../data/museum-minerals.json";
import museumModifiers from "../data/museum-modifiers.json";
import museumConfig from "../data/museum-config.json";

import type { BuildState, Rarity } from "./types";

import type { FinalStats } from "./calculateFinalStats";

type StatKey = keyof FinalStats;

type MuseumContribution = Partial<Record<StatKey, number>>;

function getRarityBonus(rarity: Rarity): number {
  return Number(museumConfig.rarityModifierBonus[rarity] ?? 0);
}

function slotContribution(
  slot: BuildState["museumSlots"][number],
): MuseumContribution {
  const mineral = museumMinerals.find(
    (mineral) => mineral.id === slot.mineralId,
  );

  if (!mineral) {
    return {};
  }

  const contribution: MuseumContribution = {
    ...(mineral.stats ?? {}),
  };

  const modifier = museumModifiers.find(
    (modifier) => modifier.id === slot.modifierId,
  );

  if (!modifier) {
    return contribution;
  }

  const rarityBonus = getRarityBonus(slot.rarity);

  for (const statKey of modifier.affects ?? []) {
    const key = statKey as StatKey;

    const current = Number(contribution[key] ?? 0);

    const modifierBonus = rarityBonus * (modifier.isDouble ? 2 : 1);

    contribution[key] = current + modifierBonus;
  }

  return contribution;
}

export function buildMuseumMultiplierBonuses(
  build: BuildState,
): MuseumContribution {
  const result: MuseumContribution = {};

  for (const slot of build.museumSlots ?? []) {
    const contribution = slotContribution(slot);

    for (const [statKey, value] of Object.entries(contribution)) {
      const key = statKey as StatKey;

      result[key] = Number(result[key] ?? 0) + Number(value ?? 0);
    }
  }

  return result;
}

export function applyMuseum(stats: FinalStats, build: BuildState): void {
  const multipliers = buildMuseumMultiplierBonuses(build);

  for (const [statKey, multiplierBonus] of Object.entries(multipliers)) {
    const key = statKey as StatKey;

    stats[key] *= 1 + Number(multiplierBonus ?? 0);
  }
}
