import rings from "../data/rings.json";
import necklaces from "../data/necklaces.json";
import charms from "../data/charms.json";
import shovels from "../data/shovels.json";
import pans from "../data/pans.json";
import mutations from "../data/mutations.json";
import enchants from "../data/enchants.json";
import museumMinerals from "../data/museum-minerals.json";
import museumModifiers from "../data/museum-modifiers.json";

import { evaluateBuild } from "./evaluateBuild";

import { createBuildState } from "./createBuildState";

import type {
  BuildState,
  Enchant,
  EquipmentItem,
  MuseumMineral,
  MuseumModifier,
  Mutation,
} from "./types";

import type { AccessSettings } from "../access/accessTypes";

import {
  areMutationsAccessible,
  DEFAULT_ACCESS_SETTINGS,
  isItemAccessible,
  isMuseumMineralAccessible,
} from "../access/accessRules";

import { canUseMuseumModifier } from "../helpers/museumValidation";

export interface UpgradeRecommendation {
  slot: string;

  itemName: string;

  enchantName?: string | null;

  mutationName?: string | null;

  modifierName?: string | null;

  currentName: string;

  recommendedName: string;

  efficiencyGain: number;

  percentGain: number;

  luckGain: number;

  luckPercentGain: number;

  balanceScore: number;

  digsImproved: boolean;
}

const typedPans = pans as EquipmentItem[];

const typedShovels = shovels as EquipmentItem[];

const typedNecklaces = necklaces as EquipmentItem[];

const typedCharms = charms as EquipmentItem[];

const typedRings = rings as EquipmentItem[];

const typedMutations = mutations as Mutation[];

const typedEnchants = enchants as Enchant[];

const typedMuseumMinerals = museumMinerals as MuseumMineral[];

const typedMuseumModifiers = museumModifiers as MuseumModifier[];


function getNameById<T extends { id: string; name: string }>(
  id: string | null | undefined,
  items: T[],
): string | null {
  if (!id) {
    return null;
  }

  return items.find((item) => item.id === id)?.name ?? id;
}

function formatModifiedName(
  itemName: string | null,
  modifierName?: string | null,
): string {
  if (!itemName) {
    return "None";
  }

  return [modifierName, itemName].filter(Boolean).join(" ");
}

function isSameItemAndModifier(
  currentItemId: string | null,
  nextItemId: string | null,
  currentModifierId: string | null,
  nextModifierId: string | null,
): boolean {
  return (
    currentItemId === nextItemId &&
    currentModifierId === nextModifierId
  );
}

function getPercentGain(
  gain: number,
  baseValue: number,
): number {
  const denominator = Math.max(Math.abs(baseValue), 1);

  return (gain / denominator) * 100;
}

function getBalancedUpgradeScore(
  efficiencyPercentGain: number,
  luckPercentGain: number,
): number {
  return (efficiencyPercentGain + luckPercentGain) / 2;
}

function getAccessibleMutations(
  accessSettings: AccessSettings,
): Mutation[] {
  if (!areMutationsAccessible(accessSettings)) {
    return [];
  }

  return typedMutations.filter((mutation) =>
    isItemAccessible(mutation as any, accessSettings),
  );
}

function getAccessibleItems<T extends EquipmentItem>(
  items: T[],
  accessSettings: AccessSettings,
): T[] {
  return items.filter((item) =>
    isItemAccessible(item as any, accessSettings),
  );
}

function buildFromCurrent(
  buildState: BuildState,
  overrides: Partial<{
    selectedPan: string | null;
    selectedPanEnchant: string | null;
    selectedShovel: string | null;
    selectedNecklace: string | null;
    selectedNecklaceMutation: string | null;
    selectedCharm: string | null;
    selectedCharmMutation: string | null;
    selectedRings: Array<string | null>;
    selectedRingMutations: Array<string | null>;
    museumSlots: BuildState["museumSlots"];
  }>,
): BuildState {
  return createBuildState({
    selectedPan: overrides.selectedPan ?? buildState.panId,

    selectedPanEnchant:
      overrides.selectedPanEnchant ?? buildState.panEnchantId,

    selectedShovel: overrides.selectedShovel ?? buildState.shovelId,

    selectedNecklace: overrides.selectedNecklace ?? buildState.necklaceId,

    selectedNecklaceMutation:
      overrides.selectedNecklaceMutation ?? buildState.necklaceMutationId,

    selectedCharm: overrides.selectedCharm ?? buildState.charmId,

    selectedCharmMutation:
      overrides.selectedCharmMutation ?? buildState.charmMutationId,

    selectedRings:
      overrides.selectedRings ??
      buildState.rings.map((ring) => ring.ringId),

    selectedRingMutations:
      overrides.selectedRingMutations ??
      buildState.rings.map((ring) => ring.mutationId),

    permanentBuffs: buildState.permanentBuffs,
    selectedConsumables: buildState.selectedConsumables,

    museumSlots: overrides.museumSlots ?? buildState.museumSlots,
  });
}

export function recommendUpgrades(
  buildState: BuildState,
  ringSlotLimit: number,
  accessSettings: AccessSettings = DEFAULT_ACCESS_SETTINGS,
): UpgradeRecommendation[] {
  const baseEvaluation = evaluateBuild(buildState);

  const baseEfficiency = baseEvaluation.efficiency;

  const baseLuck = baseEvaluation.stats.luck;

  const recommendations: UpgradeRecommendation[] = [];

  const accessiblePans = getAccessibleItems(typedPans, accessSettings);

  const accessibleShovels = getAccessibleItems(typedShovels, accessSettings);

  const accessibleNecklaces = getAccessibleItems(
    typedNecklaces,
    accessSettings,
  );

  const accessibleCharms = getAccessibleItems(typedCharms, accessSettings);

  const accessibleRings = getAccessibleItems(
    typedRings,
    accessSettings,
  );

  const accessibleMutations = getAccessibleMutations(accessSettings);

  const accessibleMuseumMinerals = typedMuseumMinerals.filter((mineral) =>
    isMuseumMineralAccessible(mineral as any, accessSettings),
  );

  const accessibleMuseumModifiers = typedMuseumModifiers.filter((modifier) =>
    isItemAccessible(modifier as any, accessSettings),
  );

  function pushRecommendation(
    slot: string,
    itemName: string,
    currentName: string,
    recommendedName: string,
    updated: BuildState,
    enchantName?: string | null,
    mutationName?: string | null,
    modifierName?: string | null,
  ) {
    const evaluated = evaluateBuild(updated);

    const efficiencyGain = evaluated.efficiency - baseEfficiency;

    const percentGain = getPercentGain(efficiencyGain, baseEfficiency);

    const luckGain = evaluated.stats.luck - baseLuck;

    const luckPercentGain = getPercentGain(luckGain, baseLuck);

    const balanceScore = getBalancedUpgradeScore(
      percentGain,
      luckPercentGain,
    );

    if (balanceScore <= 0) {
      return;
    }

    recommendations.push({
      slot,

      itemName,

      enchantName,

      mutationName,

      modifierName,

      currentName,

      recommendedName,

      efficiencyGain,

      percentGain,

      luckGain,

      luckPercentGain,

      balanceScore,

      digsImproved:
        evaluated.cycleData.digsRequired <
        baseEvaluation.cycleData.digsRequired,
    });
  }

  for (const pan of accessiblePans) {
    for (const enchant of typedEnchants) {
      if (
        isSameItemAndModifier(
          buildState.panId,
          pan.id,
          buildState.panEnchantId,
          enchant.id,
        )
      ) {
        continue;
      }

      pushRecommendation(
        "Pan",
        pan.name,
        formatModifiedName(
          getNameById(buildState.panId, typedPans),
          getNameById(buildState.panEnchantId, typedEnchants),
        ),
        formatModifiedName(pan.name, enchant.name),
        buildFromCurrent(buildState, {
          selectedPan: pan.id,
          selectedPanEnchant: enchant.id,
        }),
        enchant.name,
      );
    }
  }

  for (const shovel of accessibleShovels) {
    if (shovel.id === buildState.shovelId) {
      continue;
    }

    pushRecommendation(
      "Shovel",
      shovel.name,
      formatModifiedName(getNameById(buildState.shovelId, typedShovels)),
      formatModifiedName(shovel.name),
      buildFromCurrent(buildState, {
        selectedShovel: shovel.id,
      }),
    );
  }

  for (const necklace of accessibleNecklaces) {
    const mutationOptions = [null, ...accessibleMutations];

    for (const mutation of mutationOptions) {
      const mutationId = mutation?.id ?? null;

      if (
        isSameItemAndModifier(
          buildState.necklaceId,
          necklace.id,
          buildState.necklaceMutationId,
          mutationId,
        )
      ) {
        continue;
      }

      pushRecommendation(
        "Necklace",
        necklace.name,
        formatModifiedName(
          getNameById(buildState.necklaceId, typedNecklaces),
          getNameById(buildState.necklaceMutationId, typedMutations),
        ),
        formatModifiedName(necklace.name, mutation?.name ?? null),
        buildFromCurrent(buildState, {
          selectedNecklace: necklace.id,
          selectedNecklaceMutation: mutationId,
        }),
        null,
        mutation?.name ?? null,
      );
    }
  }

  for (const charm of accessibleCharms) {
    const mutationOptions = [null, ...accessibleMutations];

    for (const mutation of mutationOptions) {
      const mutationId = mutation?.id ?? null;

      if (
        isSameItemAndModifier(
          buildState.charmId,
          charm.id,
          buildState.charmMutationId,
          mutationId,
        )
      ) {
        continue;
      }

      pushRecommendation(
        "Charm",
        charm.name,
        formatModifiedName(
          getNameById(buildState.charmId, typedCharms),
          getNameById(buildState.charmMutationId, typedMutations),
        ),
        formatModifiedName(charm.name, mutation?.name ?? null),
        buildFromCurrent(buildState, {
          selectedCharm: charm.id,
          selectedCharmMutation: mutationId,
        }),
        null,
        mutation?.name ?? null,
      );
    }
  }

  for (let index = 0; index < ringSlotLimit; index++) {
    const currentRing = buildState.rings[index] ?? {
      ringId: null,
      mutationId: null,
    };

    const mutationOptions = [null, ...accessibleMutations];

    for (const ring of accessibleRings) {
      const alreadyEquippedUniqueRing =
        ring.unique === true &&
        buildState.rings.some(
          (equippedRing, equippedRingIndex) =>
            equippedRingIndex !== index && equippedRing.ringId === ring.id,
        );

      if (alreadyEquippedUniqueRing) {
        continue;
      }

      for (const mutation of mutationOptions) {
        const mutationId = mutation?.id ?? null;

        if (
          isSameItemAndModifier(
            currentRing.ringId,
            ring.id,
            currentRing.mutationId,
            mutationId,
          )
        ) {
          continue;
        }

        const ringIds = buildState.rings.map((selectedRing) =>
          selectedRing.ringId,
        );

        const mutationIds = buildState.rings.map((selectedRing) =>
          selectedRing.mutationId,
        );

        ringIds[index] = ring.id;

        mutationIds[index] = mutationId;

        pushRecommendation(
          `Ring ${index + 1}`,
          ring.name,
          formatModifiedName(
            getNameById(currentRing.ringId, typedRings),
            getNameById(currentRing.mutationId, typedMutations),
          ),
          formatModifiedName(ring.name, mutation?.name ?? null),
          buildFromCurrent(buildState, {
            selectedRings: ringIds,
            selectedRingMutations: mutationIds,
          }),
          null,
          mutation?.name ?? null,
        );
      }
    }
  }

  for (const slot of buildState.museumSlots) {
    const usedMinerals = new Set(
      buildState.museumSlots
        .filter((currentSlot) => currentSlot.slotId !== slot.slotId)
        .map((currentSlot) => currentSlot.mineralId)
        .filter(Boolean) as string[],
    );

    const mineralOptions = accessibleMuseumMinerals.filter(
      (mineral) =>
        mineral.rarity.toLowerCase() === slot.rarity.toLowerCase() &&
        (!usedMinerals.has(mineral.id) || mineral.id === slot.mineralId),
    );

    for (const mineral of mineralOptions) {
      const modifierOptions = [null, ...accessibleMuseumModifiers].filter(
        (modifier) => canUseMuseumModifier(mineral, modifier),
      );

      for (const modifier of modifierOptions) {
        const modifierId = modifier?.id ?? null;

        if (
          slot.mineralId === mineral.id &&
          slot.modifierId === modifierId
        ) {
          continue;
        }

        const nextMuseumSlots = buildState.museumSlots.map((currentSlot) =>
          currentSlot.slotId === slot.slotId
            ? {
                ...currentSlot,
                mineralId: mineral.id,
                modifierId,
              }
            : currentSlot,
        );

        pushRecommendation(
          `Museum Slot ${slot.slotId}`,
          mineral.name,
          formatModifiedName(
            getNameById(slot.mineralId, typedMuseumMinerals),
            getNameById(slot.modifierId, typedMuseumModifiers),
          ),
          formatModifiedName(mineral.name, modifier?.name ?? null),
          buildFromCurrent(buildState, {
            museumSlots: nextMuseumSlots,
          }),
          null,
          null,
          modifier?.name ?? null,
        );
      }
    }
  }

  recommendations.sort((a, b) => b.balanceScore - a.balanceScore);

  return recommendations.slice(0, 25);
}
