import type { BuildState, PartialStats } from "./types";

import type { EvaluatedBuild } from "../optimizer/evaluatedTypes";

import { addStats, emptyStats } from "./calculateFinalStats";

import { resolveBuildEquipment } from "./resolveBuildEquipment";

import { efficiencyCore } from "./core/efficiencyCore";

import { applyMutation } from "./applyMutations";

import { applyEnchant } from "./applyEnchants";

import { buildMuseumMultiplierBonuses } from "./applyMuseum";

import { getPermanentBuffBonuses } from "./applyPermanentBuffs";

import {
  type ConsumableBonusAmplifiers,
  getConsumableBonuses,
} from "./applyConsumables";

import { baseStats } from "./baseStats";

function buildMutatedStats(itemStats: any, mutation?: any) {
  const localStats = emptyStats();

  addStats(localStats, itemStats);

  applyMutation(localStats as any, mutation);

  return localStats;
}

function addMultiplierBonuses(target: PartialStats, source?: PartialStats) {
  if (!source) {
    return;
  }

  for (const [statKey, value] of Object.entries(source)) {
    const key = statKey as keyof PartialStats;

    target[key] = Number(target[key] ?? 0) + Number(value ?? 0);
  }
}

function applyBonusMultipliers(stats: ReturnType<typeof emptyStats>, bonuses: PartialStats) {
  for (const [statKey, bonus] of Object.entries(bonuses)) {
    const key = statKey as keyof typeof stats;

    stats[key] *= 1 + Number(bonus ?? 0);
  }
}


function addEquipmentMultiplierBonuses(target: PartialStats, item?: any) {
  addMultiplierBonuses(target, item?.multipliers);
}

function addConsumableAmplifierStats(
  target: PartialStats,
  source?: PartialStats,
) {
  addMultiplierBonuses(target, source);
}

function addEquipmentConsumableBonusAmplifiers(
  target: ConsumableBonusAmplifiers,
  item?: any,
) {
  const amplifiersByConsumable = item?.consumableBonusAmplifiers;

  if (!amplifiersByConsumable) {
    return;
  }

  for (const [consumableId, amplifiers] of Object.entries(
    amplifiersByConsumable,
  ) as Array<[
    string,
    { flat?: PartialStats; multipliers?: PartialStats },
  ]>) {
    target[consumableId] ??= {};

    if (amplifiers.flat) {
      target[consumableId].flat ??= {};
      addConsumableAmplifierStats(target[consumableId].flat, amplifiers.flat);
    }

    if (amplifiers.multipliers) {
      target[consumableId].multipliers ??= {};
      addConsumableAmplifierStats(
        target[consumableId].multipliers,
        amplifiers.multipliers,
      );
    }
  }
}

function getEquipmentConsumableBonusAmplifiers(
  equipment: ReturnType<typeof resolveBuildEquipment>,
): ConsumableBonusAmplifiers {
  const amplifiers: ConsumableBonusAmplifiers = {};

  addEquipmentConsumableBonusAmplifiers(amplifiers, equipment.pan);
  addEquipmentConsumableBonusAmplifiers(amplifiers, equipment.shovel);

  return amplifiers;
}

function addEquipmentGlobalMultiplierBonuses(
  target: PartialStats,
  equipment: ReturnType<typeof resolveBuildEquipment>,
) {
  addEquipmentMultiplierBonuses(target, equipment.pan);
  addEquipmentMultiplierBonuses(target, equipment.shovel);
}

export function evaluateBuild(build: BuildState): EvaluatedBuild {
  const equipment = resolveBuildEquipment(build);

  const stats = emptyStats();

  addStats(stats, baseStats);

  const permanentBuffBonuses = getPermanentBuffBonuses(build.permanentBuffs);

  const consumableBonuses = getConsumableBonuses(
    build.selectedConsumables,
    getEquipmentConsumableBonusAmplifiers(equipment),
  );

  addStats(stats, permanentBuffBonuses.flat);

  addStats(stats, consumableBonuses.flat);

  const panStats = emptyStats();

  addStats(panStats, equipment.pan?.stats);

  applyEnchant(panStats as any, equipment.panEnchant);

  addStats(stats, panStats);

  addStats(stats, equipment.shovel?.stats);

  if (equipment.necklace) {
    addStats(
      stats,

      buildMutatedStats(equipment.necklace.stats, equipment.necklaceMutation),
    );
  }

  if (equipment.charm) {
    addStats(
      stats,

      buildMutatedStats(equipment.charm.stats, equipment.charmMutation),
    );
  }

  for (let i = 0; i < equipment.rings.length; i++) {
    const ring = equipment.rings[i];

    if (!ring || !("stats" in ring)) {
      continue;
    }

    addStats(
      stats,

      buildMutatedStats(ring.stats, ring.mutation),
    );
  }

  const multiplierBonuses: PartialStats = {};

  addEquipmentGlobalMultiplierBonuses(multiplierBonuses, equipment);

  addMultiplierBonuses(multiplierBonuses, permanentBuffBonuses.multipliers);

  addMultiplierBonuses(multiplierBonuses, consumableBonuses.multipliers);

  addMultiplierBonuses(multiplierBonuses, buildMuseumMultiplierBonuses(build));

  applyBonusMultipliers(stats, multiplierBonuses);

  const cycleData = efficiencyCore(stats as any);

  const efficiency = cycleData.efficiency;

  const modifierLuck = cycleData.modifierLuck;

  const modifierEfficiency = cycleData.modifierEfficiency;

  return {
    build,

    stats,

    efficiency,

    modifierLuck,

    modifierEfficiency,

    objectiveScore: efficiency,

    cycleData: {
      cycleTime: cycleData.cycleTime,

      shakeTime: cycleData.shakeTime,

      digTime: cycleData.totalDigTime,

      digsRequired: cycleData.digsRequired,

      totalDigTime: cycleData.totalDigTime,

      timePerDig: cycleData.timePerDig,

      r: cycleData.r,

      totalShakes: cycleData.totalShakes,
    },

    valid: true,
  };
}
