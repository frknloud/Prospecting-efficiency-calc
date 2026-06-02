import { BuildState } from "../engine/types";
import { UpgradeCandidate } from "./candidateTypes";
import type { LockedSlots } from "./types";
import {
  areMutationsAccessible,
  DEFAULT_ACCESS_SETTINGS,
  isItemAccessible,
  isMuseumMineralAccessible,
} from "../access/accessRules";

import type { AccessSettings } from "../access/accessTypes";

import {
  getOptimizerSearchProfile,
  isOptimizerAccessoryAllowed,
  isOptimizerMutationAllowed,
  isOptimizerShovelAllowed,
} from "./searchProfiles";

import { canUseMuseumModifier } from "../helpers/museumValidation";

import pans from "../data/pans.json";
import shovels from "../data/shovels.json";
import necklaces from "../data/necklaces.json";
import charms from "../data/charms.json";
import rings from "../data/rings.json";
import mutations from "../data/mutations.json";
import enchants from "../data/enchants.json";
import museumMinerals from "../data/museum-minerals.json";
import museumModifiers from "../data/museum-modifiers.json";

const MAX_MUSEUM_MINERAL_CANDIDATES_PER_SLOT = 8;

const MAX_MUSEUM_MODIFIER_CANDIDATES_PER_SLOT = 8;

function getStatValue(
  stats: Record<string, number | undefined> | undefined,
  stat: string,
): number {
  return Number(stats?.[stat] ?? 0);
}

function scoreMuseumMineral(
  mineral: {
    stats?: Record<string, number | undefined>;
  },
  relevantStats: Set<string>,
): number {
  let score = 0;

  for (const stat of relevantStats) {
    score += getStatValue(mineral.stats, stat);
  }

  return score;
}

function scoreMuseumModifier(
  modifier: {
    affects?: string[];
    isDouble?: boolean;
  },
  relevantStats: Set<string>,
): number {
  let score = 0;

  for (const stat of modifier.affects ?? []) {
    if (relevantStats.has(stat)) {
      score += modifier.isDouble ? 2 : 1;
    }
  }

  return score;
}

function getRelevantMuseumStats(
  objective?: string,
  secondaryObjective?: string,
): Set<string> {
  const stats = new Set<string>();

  if (objective && objective !== "efficiency") {
    stats.add(objective);
  }

  if (secondaryObjective && secondaryObjective !== "efficiency") {
    stats.add(secondaryObjective);
  }

  if (objective === "efficiency" || stats.size === 0) {
    stats.add("luck");
    stats.add("capacity");
    stats.add("digSpeed");
    stats.add("digStrength");
    stats.add("walkSpeed");
    stats.add("sellBoost");
    stats.add("sizeBoost");
  }

  return stats;
}

function getMuseumMineral(mineralId: string | null | undefined) {
  return museumMinerals.find((mineral) => mineral.id === mineralId);
}

function getMuseumModifier(modifierId: string | null | undefined) {
  return museumModifiers.find((modifier) => modifier.id === modifierId);
}

export function generateUpgradeCandidates(
  build: BuildState,
  ringSlotLimit: number,
  lockedSlots?: LockedSlots,
  objective?: string,
  secondaryObjective?: string,
  accessSettings: AccessSettings = DEFAULT_ACCESS_SETTINGS,
): UpgradeCandidate[] {
  const candidates: UpgradeCandidate[] = [];

  const counts = {
    pan: 0,
    panEnchant: 0,
    shovel: 0,
    necklace: 0,
    necklaceMutation: 0,
    charm: 0,
    charmMutation: 0,
    ring: 0,
    ringMutation: 0,
    museumMineral: 0,
    museumModifier: 0,
  };

  const relevantMuseumStats = getRelevantMuseumStats(
    objective,
    secondaryObjective,
  );

  const mutationsAccessible = areMutationsAccessible(accessSettings);

  const searchProfile = getOptimizerSearchProfile(accessSettings);

  const availablePans = pans.filter((pan) =>
    isItemAccessible(pan as any, accessSettings),
  );

  const availableShovels = shovels.filter(
    (shovel) =>
      isItemAccessible(shovel as any, accessSettings) &&
      isOptimizerShovelAllowed(shovel as any, accessSettings),
  );

  const availableNecklaces = necklaces.filter(
    (necklace) =>
      isItemAccessible(necklace as any, accessSettings) &&
      isOptimizerAccessoryAllowed(necklace as any, searchProfile),
  );

  const availableCharms = charms.filter(
    (charm) =>
      isItemAccessible(charm as any, accessSettings) &&
      isOptimizerAccessoryAllowed(charm as any, searchProfile),
  );

  const availableMutations = mutations.filter(
    (mutation) =>
      (!mutation.limitedTime || accessSettings.includeLimitedTime) &&
      isOptimizerMutationAllowed(mutation.id, searchProfile),
  );

  const availableMuseumMinerals = museumMinerals.filter((mineral) =>
    isMuseumMineralAccessible(mineral as any, accessSettings),
  );

  const availableMuseumModifiers = museumModifiers.filter((modifier) =>
    isItemAccessible(modifier as any, accessSettings),
  );

  const availableRings = rings.filter(
    (ring) =>
      isItemAccessible(ring as any, accessSettings) &&
      isOptimizerAccessoryAllowed(ring as any, searchProfile),
  );

  if (!lockedSlots?.pan) {
    for (const pan of availablePans) {
      if (pan.id === build.panId) {
        continue;
      }
      counts.pan++;
      candidates.push({
        slot: "pan",
        previousItemId: build.panId ?? undefined,
        newItemId: pan.id,
        label: `Replace pan with ${pan.name}`,
        build: {
          ...build,
          panId: pan.id,
        },
      });
    }

    for (const enchant of enchants) {
      if (enchant.id === build.panEnchantId) {
        continue;
      }
      counts.panEnchant++;
      candidates.push({
        slot: "panEnchant",
        previousItemId: build.panEnchantId ?? undefined,
        newItemId: enchant.id,
        label: `Replace pan enchant with ${enchant.name}`,
        build: {
          ...build,
          panEnchantId: enchant.id,
        },
      });
    }
  }

  if (!lockedSlots?.shovel) {
    for (const shovel of availableShovels) {
      if (shovel.id === build.shovelId) {
        continue;
      }
      counts.shovel++;
      candidates.push({
        slot: "shovel",
        previousItemId: build.shovelId ?? undefined,
        newItemId: shovel.id,
        label: `Replace shovel with ${shovel.name}`,
        build: {
          ...build,
          shovelId: shovel.id,
        },
      });
    }
  }

  if (!lockedSlots?.necklace) {
    for (const necklace of availableNecklaces) {
      if (necklace.id === build.necklaceId) {
        continue;
      }
      counts.necklace++;
      candidates.push({
        slot: "necklace",
        previousItemId: build.necklaceId ?? undefined,
        newItemId: necklace.id,
        label: `Replace necklace with ${necklace.name}`,
        build: {
          ...build,
          necklaceId: necklace.id,
        },
      });
    }

    if (build.necklaceId && mutationsAccessible) {
      for (const mutation of availableMutations) {
        if (mutation.id === build.necklaceMutationId) {
          continue;
        }
        counts.necklaceMutation++;
        candidates.push({
          slot: "necklaceMutation",
          previousItemId: build.necklaceMutationId ?? undefined,
          newItemId: mutation.id,
          label: `Replace necklace mutation with ${mutation.name}`,
          build: {
            ...build,
            necklaceMutationId: mutation.id,
          },
        });
      }
    }
  }

  if (!lockedSlots?.charm) {
    for (const charm of availableCharms) {
      if (charm.id === build.charmId) {
        continue;
      }
      counts.charm++;
      candidates.push({
        slot: "charm",
        previousItemId: build.charmId ?? undefined,
        newItemId: charm.id,
        label: `Replace charm with ${charm.name}`,
        build: {
          ...build,
          charmId: charm.id,
        },
      });
    }

    if (build.charmId && mutationsAccessible) {
      for (const mutation of availableMutations) {
        if (mutation.id === build.charmMutationId) {
          continue;
        }
        counts.charmMutation++;
        candidates.push({
          slot: "charmMutation",
          previousItemId: build.charmMutationId ?? undefined,
          newItemId: mutation.id,
          label: `Replace charm mutation with ${mutation.name}`,
          build: {
            ...build,
            charmMutationId: mutation.id,
          },
        });
      }
    }
  }

  for (let i = 0; i < ringSlotLimit; i++) {
    if (lockedSlots?.rings[i]) {
      continue;
    }
    const currentRing = build.rings[i] ?? {
      ringId: null,
      mutationId: null,
    };
    for (const ring of availableRings) {
      if (ring.id === currentRing.ringId) {
        continue;
      }

      const equippedRingIds = build.rings.map((ring) => ring?.ringId);

      const alreadyEquipped = equippedRingIds.includes(ring.id);

      if (ring.unique === true && alreadyEquipped) {
        continue;
      }

      const updatedRings = Array.from(
        {
          length: ringSlotLimit,
        },
        (_, slotIndex) => {
          const existing = build.rings[slotIndex];

          return {
            ringId: existing?.ringId ?? null,

            mutationId: existing?.mutationId ?? null,
          };
        },
      );

      updatedRings[i] = {
        ...updatedRings[i],
        ringId: ring.id,
      };
      counts.ring++;
      candidates.push({
        slot: "ring",

        previousItemId: currentRing.ringId ?? undefined,

        newItemId: ring.id,

        label: `Replace ring ${i + 1} with ${ring.name}`,

        build: {
          ...build,
          rings: updatedRings,
        },
      });
    }

    if (!currentRing.ringId || !mutationsAccessible) {
      continue;
    }

    for (const mutation of availableMutations) {
      if (mutation.id === currentRing.mutationId) {
        continue;
      }

      const updatedRings = Array.from(
        {
          length: ringSlotLimit,
        },
        (_, slotIndex) => {
          const existing = build.rings[slotIndex];

          return {
            ringId: existing?.ringId ?? null,

            mutationId: existing?.mutationId ?? null,
          };
        },
      );

      updatedRings[i] = {
        ...updatedRings[i],
        mutationId: mutation.id,
      };

      counts.ringMutation++;

      candidates.push({
        slot: `ringMutation${i + 1}`,

        previousItemId: currentRing.mutationId ?? undefined,

        newItemId: mutation.id,

        label: `Replace ring ${i + 1} mutation with ${mutation.name}`,

        build: {
          ...build,
          rings: updatedRings,
        },
      });
    }
  }

  for (const slot of build.museumSlots ?? []) {
    const museumSlotIndex = build.museumSlots.findIndex(
      (museumSlot) => museumSlot.slotId === slot.slotId,
    );

    if (lockedSlots?.museumSlots[museumSlotIndex]) {
      continue;
    }

    const rankedMuseumMinerals = availableMuseumMinerals
      .filter((mineral) => {
        if (mineral.id === slot.mineralId) {
          return false;
        }

        const mineralAlreadyUsedInAnotherSlot = build.museumSlots.some(
          (otherSlot) =>
            otherSlot.slotId !== slot.slotId &&
            otherSlot.mineralId === mineral.id,
        );

        if (mineralAlreadyUsedInAnotherSlot) {
          return false;
        }

        if (mineral.rarity !== slot.rarity) {
          return false;
        }

        const currentModifier = getMuseumModifier(slot.modifierId);

        if (!canUseMuseumModifier(mineral, currentModifier)) {
          return false;
        }

        const mineralStats = Object.keys(mineral.stats ?? {});

        return mineralStats.some((stat) => relevantMuseumStats.has(stat));
      })
      .sort(
        (a, b) =>
          scoreMuseumMineral(b, relevantMuseumStats) -
          scoreMuseumMineral(a, relevantMuseumStats),
      )
      .slice(0, MAX_MUSEUM_MINERAL_CANDIDATES_PER_SLOT);

    for (const mineral of rankedMuseumMinerals) {
      const updatedMuseumSlots = build.museumSlots.map((currentSlot) =>
        currentSlot.slotId === slot.slotId
          ? {
              ...currentSlot,
              mineralId: mineral.id,
            }
          : currentSlot,
      );

      counts.museumMineral++;

      candidates.push({
        slot: "museumMineral",

        previousItemId: slot.mineralId ?? undefined,

        newItemId: mineral.id,

        label: `Replace museum slot ${slot.slotId} mineral with ${mineral.name}`,

        build: {
          ...build,
          museumSlots: updatedMuseumSlots,
        },
      });
    }

    const rankedMuseumModifiers = availableMuseumModifiers
      .filter((modifier) => {
        if (modifier.id === slot.modifierId) {
          return false;
        }

        const currentMineral = getMuseumMineral(slot.mineralId);

        if (!currentMineral) {
          return false;
        }

        if (!canUseMuseumModifier(currentMineral, modifier)) {
          return false;
        }

        return (modifier.affects ?? []).some((stat) =>
          relevantMuseumStats.has(stat),
        );
      })
      .sort(
        (a, b) =>
          scoreMuseumModifier(b, relevantMuseumStats) -
          scoreMuseumModifier(a, relevantMuseumStats),
      )
      .slice(0, MAX_MUSEUM_MODIFIER_CANDIDATES_PER_SLOT);

    for (const modifier of rankedMuseumModifiers) {
      const updatedMuseumSlots = build.museumSlots.map((currentSlot) =>
        currentSlot.slotId === slot.slotId
          ? {
              ...currentSlot,
              modifierId: modifier.id,
            }
          : currentSlot,
      );

      counts.museumModifier++;

      candidates.push({
        slot: "museumModifier",

        previousItemId: slot.modifierId ?? undefined,

        newItemId: modifier.id,

        label: `Replace museum slot ${slot.slotId} modifier with ${modifier.name}`,

        build: {
          ...build,
          museumSlots: updatedMuseumSlots,
        },
      });
    }
  }

  return candidates;
}
