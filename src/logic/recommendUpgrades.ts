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

function evaluateBuild(build: BuildState) {
  const selectedEquipment = [
    build.panId
      ? {
          ...pans.find((item) => item.name === build.panId),
          stats: applyEnchant(
            pans.find((item) => item.name === build.panId)?.stats ?? {},
            enchants.find((item) => item.name === build.panEnchantId)
          )
        }
      : undefined,

    shovels.find((item) => item.name === build.shovelId),

    build.necklaceId
      ? {
          ...necklaces.find((item) => item.name === build.necklaceId),
          stats: applyMutation(
            necklaces.find((item) => item.name === build.necklaceId)?.stats ?? {},
            mutations.find((item) => item.name === build.necklaceMutationId)
          )
        }
      : undefined,

    build.charmId
      ? {
          ...charms.find((item) => item.name === build.charmId),
          stats: applyMutation(
            charms.find((item) => item.name === build.charmId)?.stats ?? {},
            mutations.find((item) => item.name === build.charmMutationId)
          )
        }
      : undefined,

    ...build.rings.map((ringSelection) => {
      const ring = rings.find((item) => item.name === ringSelection.ringId);

      if (!ring) return undefined;

      return {
        ...ring,
        stats: applyMutation(
          ring.stats,
          mutations.find((item) => item.name === ringSelection.mutationId)
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

  rings.forEach((ring) => {
    mutations.forEach((mutation) => {
      const alreadyEquipped = activeRings.some(
        (equippedRing) =>
          equippedRing.ringId === ring.name &&
          equippedRing.mutationId === mutation.name
      );

      if (alreadyEquipped) return;

      activeRings.forEach((ringSelection, index) => {
        if (
          ringSelection.ringId === ring.name &&
          ringSelection.mutationId === mutation.name
        ) {
          return;
        }

        const updatedRings = build.rings.map((existingRing, ringIndex) =>
          ringIndex === index
            ? {
                ringId: ring.name,
                mutationId: mutation.name
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

        const key = recommendationKey({
          ...recommendation,
          slot: 'Ring'
        });

        if (seenRecommendations.has(key)) {
          return;
        }

        seenRecommendations.add(key);

        recommendations.push(recommendation);
      });
    });
  });

  necklaces.forEach((necklace) => {
    mutations.forEach((mutation) => {
      if (
        build.necklaceId === necklace.name &&
        build.necklaceMutationId === mutation.name
      ) {
        return;
      }

      const testBuild: BuildState = {
        ...build,
        necklaceId: necklace.name,
        necklaceMutationId: mutation.name
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
  });

  charms.forEach((charm) => {
    mutations.forEach((mutation) => {
      if (
        build.charmId === charm.name &&
        build.charmMutationId === mutation.name
      ) {
        return;
      }

      const testBuild: BuildState = {
        ...build,
        charmId: charm.name,
        charmMutationId: mutation.name
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
  });

  return recommendations
    .sort((a, b) => b.efficiencyGain - a.efficiencyGain)
    .slice(0, 10);
}
