import pans from '../data/pans.json';
import shovels from '../data/shovels.json';
import rings from '../data/rings.json';
import necklaces from '../data/necklaces.json';
import charms from '../data/charms.json';
import mutations from '../data/mutations.json';
import enchants from '../data/enchants.json';

import { BuildState } from '../types';

import { calculateStats } from './calculateStats';
import { calculateEfficiency } from './calculateEfficiency';
import { applyMutation } from './applyMutations';
import { applyEnchant } from './applyEnchants';

export interface UpgradeRecommendation {
  slot: string;
  itemName: string;
  mutationName?: string | null;
  efficiencyGain: number;
  percentGain: number;
  digsImproved: boolean;
}

const PRISMATIC_MUTATION = mutations.find(
  (mutation) => mutation.id === 'prismatic'
);

function evaluateBuild(build: BuildState) {
  const selectedEquipment = [
    build.panId
      ? {
          ...pans.find((item) => item.id === build.panId),
          stats: applyEnchant(
            pans.find((item) => item.id === build.panId)?.stats ?? {},
            enchants.find((item) => item.id === build.panEnchantId)
          )
        }
      : undefined,

    shovels.find((item) => item.id === build.shovelId),

    build.necklaceId
      ? {
          ...necklaces.find((item) => item.id === build.necklaceId),
          stats: applyMutation(
            necklaces.find((item) => item.id === build.necklaceId)?.stats ?? {},
            mutations.find((item) => item.id === build.necklaceMutationId)
          )
        }
      : undefined,

    build.charmId
      ? {
          ...charms.find((item) => item.id === build.charmId),
          stats: applyMutation(
            charms.find((item) => item.id === build.charmId)?.stats ?? {},
            mutations.find((item) => item.id === build.charmMutationId)
          )
        }
      : undefined,

    ...build.rings.map((ringSelection) => {
      const ring = rings.find((item) => item.id === ringSelection.ringId);

      if (!ring) return undefined;

      return {
        ...ring,
        stats: applyMutation(
          ring.stats,
          mutations.find((item) => item.id === ringSelection.mutationId)
        )
      };
    })
  ];

  const stats = calculateStats(selectedEquipment);

  return calculateEfficiency(stats);
}

function recommendationKey(
  recommendation: UpgradeRecommendation
): string {
  return [
    recommendation.slot,
    recommendation.itemName,
    recommendation.mutationName
  ].join('|');
}

export function recommendUpgrades(
  build: BuildState,
  ringSlotLimit = 8
): UpgradeRecommendation[] {
  const current = evaluateBuild(build);

  const recommendations: UpgradeRecommendation[] = [];

  const activeRings = build.rings.slice(0, ringSlotLimit);

  const seenRecommendations = new Set<string>();

  if (!PRISMATIC_MUTATION) {
    return [];
  }

  enchants.filter(
    (enchant) =>
      !enchant.allowedSlots ||
      enchant.allowedSlots.includes('pan')
  )
  
  const availableRings = rings.filter(
    (ring) =>
      !build.enabledRingIds ||
      build.enabledRingIds.includes(ring.id)
  );

  availableRings.forEach((ring) => {
    const mutation = PRISMATIC_MUTATION;
    if (ring.unique) {
      const alreadyUsingRing = activeRings.some(
        (equippedRing) => equippedRing.ringId === ring.id
      );

      if (alreadyUsingRing) {
        return;
      }
    }
    const alreadyEquipped = activeRings.some(
      (equippedRing) =>
        equippedRing.ringId === ring.id &&
        equippedRing.mutationId === mutation.id
    );

    if (alreadyEquipped) return;

    activeRings.forEach((ringSelection, index) => {
      if (
        ringSelection.ringId === ring.id &&
        ringSelection.mutationId === mutation.id
      ) {
        return;
      }

      const updatedRings = build.rings.map((existingRing, ringIndex) =>
        ringIndex === index
          ? {
              ringId: ring.id,
              mutationId: mutation.id
            }
          : existingRing
      );

      const testBuild: BuildState = {
        ...build,
        rings: updatedRings
      };

      const result = evaluateBuild(testBuild);

      const gain = result.efficiency - current.efficiency;

      if (gain <= 0) return;

      const recommendation: UpgradeRecommendation = {
        slot: `Ring ${index + 1}`,
        itemName: ring.name,
        mutationName: mutation.name,
        efficiencyGain: gain,
        percentGain: (gain / current.efficiency) * 100,
        digsImproved: result.digsRequired < current.digsRequired
      };

      const key = recommendationKey(recommendation);

      if (seenRecommendations.has(key)) {
        return;
      }

      seenRecommendations.add(key);

      recommendations.push(recommendation);
    });
  });

  pans.forEach((pan) => {
    if (build.panId === pan.id) {
      return;
    }

    const testBuild: BuildState = {
      ...build,
      panId: pan.id
    };

    const result = evaluateBuild(testBuild);

    const gain =
      result.efficiency - current.efficiency;

    if (gain <= 0) return;

    recommendations.push({
      slot: 'Pan',
      itemName: pan.name,
      mutationName: null,
      efficiencyGain: gain,
      percentGain:
        (gain / current.efficiency) * 100,
      digsImproved:
        result.digsRequired <
        current.digsRequired
    });
  });

  enchants.forEach((enchant) => {
    if (build.panEnchantId === enchant.id) {
      return;
    }

    const testBuild: BuildState = {
      ...build,
      panEnchantId: enchant.id
    };

    const result = evaluateBuild(testBuild);

    const gain =
      result.efficiency - current.efficiency;

    if (gain <= 0) return;

    recommendations.push({
      slot: 'Pan Enchant',
      itemName: enchant.name,
      mutationName: null,
      efficiencyGain: gain,
      percentGain:
        (gain / current.efficiency) * 100,
      digsImproved:
        result.digsRequired <
        current.digsRequired
    });
  });

  shovels.forEach((shovel) => {
    if (build.shovelId === shovel.id) {
      return;
    }

    const testBuild: BuildState = {
      ...build,
      shovelId: shovel.id
    };

    const result = evaluateBuild(testBuild);

    const gain =
      result.efficiency - current.efficiency;

    if (gain <= 0) return;

    recommendations.push({
      slot: 'Shovel',
      itemName: shovel.name,
      mutationName: null,
      efficiencyGain: gain,
      percentGain:
        (gain / current.efficiency) * 100,
      digsImproved:
        result.digsRequired <
        current.digsRequired
    });
  });
  
  necklaces.forEach((necklace) => {
    const mutation = PRISMATIC_MUTATION;

    if (
      build.necklaceId === necklace.id &&
      build.necklaceMutationId === mutation.id
    ) {
      return;
    }

    const testBuild: BuildState = {
      ...build,
      necklaceId: necklace.id,
      necklaceMutationId: mutation.id
    };

    const result = evaluateBuild(testBuild);

    const gain = result.efficiency - current.efficiency;

    if (gain <= 0) return;

    recommendations.push({
      slot: 'Necklace',
      itemName: necklace.name,
      mutationName: mutation.name,
      efficiencyGain: gain,
      percentGain: (gain / current.efficiency) * 100,
      digsImproved: result.digsRequired < current.digsRequired
    });
  });

  charms.forEach((charm) => {
    const mutation = PRISMATIC_MUTATION;

    if (
      build.charmId === charm.id &&
      build.charmMutationId === mutation.id
    ) {
      return;
    }

    const testBuild: BuildState = {
      ...build,
      charmId: charm.id,
      charmMutationId: mutation.id
    };

    const result = evaluateBuild(testBuild);

    const gain = result.efficiency - current.efficiency;

    if (gain <= 0) return;

    recommendations.push({
      slot: 'Charm',
      itemName: charm.name,
      mutationName: mutation.name,
      efficiencyGain: gain,
      percentGain: (gain / current.efficiency) * 100,
      digsImproved: result.digsRequired < current.digsRequired
    });
  });

  return recommendations
    .sort((a, b) => b.efficiencyGain - a.efficiencyGain)
    .slice(0, 10);
}
