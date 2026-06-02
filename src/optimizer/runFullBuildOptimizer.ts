import { evaluateBuild } from "../engine/evaluateBuild";

import { scoreBuild } from "./scoreBuild";

import {
  canPairObjectives,
  isEfficiencyObjective,
  isMovementObjective,
} from "./objectiveRules";

import {
  getOptimizerSearchProfile,
  isOptimizerAccessoryAllowed,
  isOptimizerEnchantAllowed,
  isOptimizerMutationAllowed,
  isOptimizerShovelAllowed,
} from "./searchProfiles";

import { objectiveValue } from "./objectiveValue";

import { buildHash } from "./buildHash";

import { isBuildLegal } from "./isBuildLegal";

import {
  areMutationsAccessible,
  DEFAULT_ACCESS_SETTINGS,
  isItemAccessible,
  isMuseumMineralAccessible,
} from "../access/accessRules";

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

import type {
  BuildState,
  MuseumMineral,
  MuseumModifier,
  MuseumSlotSelection,
  RingSelection,
} from "../engine/types";

import type {
  LockedSlots,
  OptimizerMode,
  OptimizerRequest,
  OptimizerResult,
} from "./types";

const FULL_BUILD_TIME_BUDGET_MS = 24000;

const FINAL_POLISH_TIME_BUDGET_MS = 900;

const MAX_FINAL_POLISH_CANDIDATES = 16;

const MAX_POLISH_STAGE_OPTIONS = 10;

const FULL_BUILD_CONFIG: Record<
  OptimizerMode,
  {
    beamWidth: number;
    perStageLimit: number;
  }
> = {
  fast: {
    beamWidth: 10,
    perStageLimit: 8,
  },

  balanced: {
    beamWidth: 16,
    perStageLimit: 10,
  },

  exhaustive: {
    beamWidth: 24,
    perStageLimit: 12,
  },
};

interface StageOption {
  build: BuildState;
  label: string;
}

interface ScoredBuild {
  build: BuildState;
  score: number;
  label: string;
}

interface FullBuildStage {
  name: string;
  buildOptions: (build: BuildState, request: OptimizerRequest) => StageOption[];
  optionKey: (build: BuildState) => string;
}

function getNullableId(value: string | null | undefined): string {
  return value ?? "none";
}

function getRingOptionKey(build: BuildState, ringIndex: number): string {
  const ring = build.rings[ringIndex];

  return `${getNullableId(ring?.ringId)}|${getNullableId(ring?.mutationId)}`;
}

function getRingSetKey(build: BuildState, ringSlotLimit: number): string {
  return Array.from({ length: ringSlotLimit }, (_, index) =>
    getRingOptionKey(build, index),
  ).join("||");
}

function getMuseumSetKey(build: BuildState): string {
  return (build.museumSlots ?? [])
    .slice()
    .sort((a, b) => a.slotId - b.slotId)
    .map(
      (slot) =>
        `${slot.slotId}:${getNullableId(slot.mineralId)}|${getNullableId(slot.modifierId)}`,
    )
    .join("||");
}

function getMuseumOptionKey(build: BuildState, slotId: number): string {
  const slot = build.museumSlots.find(
    (museumSlot) => museumSlot.slotId === slotId,
  );

  return `${getNullableId(slot?.mineralId)}|${getNullableId(slot?.modifierId)}`;
}

function getStageSeedLimit(config: {
  beamWidth: number;
  perStageLimit: number;
}): number {
  return Math.max(config.perStageLimit * 3, config.beamWidth);
}

function getEffectiveSecondaryObjective(
  request: OptimizerRequest,
): OptimizerRequest["secondaryObjective"] {
  return request.secondaryObjective &&
    canPairObjectives(request.objective, request.secondaryObjective)
    ? request.secondaryObjective
    : undefined;
}

function shouldUseOverhaulSearch(request: OptimizerRequest): boolean {
  const secondaryObjective = getEffectiveSecondaryObjective(request);

  return (
    hasMinStats(request) ||
    Boolean(request.forceOneTapBuilds) ||
    Boolean(secondaryObjective) ||
    isMovementObjective(request.objective) ||
    !isEfficiencyObjective(request.objective)
  );
}

function getSearchTimeBudgetMs(request: OptimizerRequest): number {
  const requestedBudget = Number(request.searchTimeBudgetMs ?? 0);

  if (Number.isFinite(requestedBudget) && requestedBudget > 0) {
    return Math.max(5_000, requestedBudget);
  }

  return FULL_BUILD_TIME_BUDGET_MS;
}

function isSearchDeadlineNear(
  request: OptimizerRequest,
  marginMs = 1_500,
): boolean {
  const deadline = Number(request.searchDeadlineMs ?? 0);

  return Number.isFinite(deadline) && deadline > 0 && Date.now() > deadline - marginMs;
}

function buildAllowedStageKeys(
  stage: FullBuildStage,
  seedBuild: BuildState,
  request: OptimizerRequest,
  config: { beamWidth: number; perStageLimit: number },
): Set<string> {
  const hasHardConstraints = hasHardSearchConstraints(request);
  const useOverhaulSearch = shouldUseOverhaulSearch(request);

  const seedLimit = hasHardConstraints
    ? Math.max(getStageSeedLimit(config), config.perStageLimit * 8, 64)
    : useOverhaulSearch
      ? Math.max(
          getStageSeedLimit(config),
          config.perStageLimit * 5,
          config.beamWidth * 2,
          40,
        )
      : getStageSeedLimit(config);

  const seedOptions = hasHardConstraints
    ? rankConstraintStageOptions(
        stage.buildOptions(seedBuild, request),
        request,
        seedLimit,
      )
    : rankStageOptions(
        stage.buildOptions(seedBuild, request),
        request,
        seedLimit,
      );

  const keys = new Set(
    seedOptions.map((option) => stage.optionKey(option.build)),
  );

  keys.add(stage.optionKey(seedBuild));

  return keys;
}

function hasMinStats(request: OptimizerRequest): boolean {
  return Boolean(request.minStats && Object.keys(request.minStats).length > 0);
}

function hasHardSearchConstraints(request: OptimizerRequest): boolean {
  return hasMinStats(request) || Boolean(request.forceOneTapBuilds);
}

function getMinConstraintStatus(
  evaluated: ReturnType<typeof evaluateBuild>,
  request: OptimizerRequest,
): {
  hasConstraints: boolean;
  passes: boolean;
  deficitRatio: number;
  progressRatio: number;
} {
  if (!request.minStats || Object.keys(request.minStats).length === 0) {
    return {
      hasConstraints: false,
      passes: true,
      deficitRatio: 0,
      progressRatio: 1,
    };
  }

  let checkedStats = 0;
  let totalDeficitRatio = 0;
  let totalProgressRatio = 0;

  for (const [stat, min] of Object.entries(request.minStats)) {
    const target = Number(min ?? 0);

    if (target <= 0) {
      continue;
    }

    checkedStats += 1;

    const value = Number(
      evaluated.stats[stat as keyof typeof evaluated.stats] ?? 0,
    );
    const safeValue = Math.max(value, 0);

    totalDeficitRatio += Math.max(target - safeValue, 0) / target;
    totalProgressRatio += Math.min(safeValue / target, 1);
  }

  if (checkedStats === 0) {
    return {
      hasConstraints: false,
      passes: true,
      deficitRatio: 0,
      progressRatio: 1,
    };
  }

  return {
    hasConstraints: true,
    passes: totalDeficitRatio <= 0,
    deficitRatio: totalDeficitRatio / checkedStats,
    progressRatio: totalProgressRatio / checkedStats,
  };
}

function scoreConstraintTargetBuild(
  build: BuildState,
  request: OptimizerRequest,
): number {
  const evaluated = evaluateBuild(build);
  const objectiveScore = scoreBuild(evaluated, request);
  const constraintStatus = getMinConstraintStatus(evaluated, request);
  const oneTapScore = request.forceOneTapBuilds
    ? getOneTapConstraintScore(evaluated)
    : 1;

  if (request.forceOneTapBuilds) {
    const oneTapBase = oneTapScore * 1_000_000_000_000;

    if (evaluated.cycleData.digsRequired !== 1) {
      return oneTapBase + objectiveScore;
    }

    if (!constraintStatus.hasConstraints) {
      return 1_000_000_000_000_000 + objectiveScore;
    }
  }

  if (!constraintStatus.hasConstraints) {
    return objectiveScore;
  }

  // Min constraints are hard requirements, not target zones. While a candidate is
  // below the desired minimum, search survival is dominated by reducing its
  // remaining deficit. Once a candidate satisfies every minimum, it switches back
  // to normal objective scoring so extra stats above the minimum can still win
  // when the primary/secondary objectives prefer them.
  if (constraintStatus.passes) {
    return 1_000_000_000_000_000 + objectiveScore;
  }

  return (
    (1 - constraintStatus.deficitRatio) * 1_000_000_000_000 + objectiveScore
  );
}

function cloneRings(build: BuildState, ringSlotLimit: number): RingSelection[] {
  return Array.from({ length: ringSlotLimit }, (_, index) => {
    const ring = build.rings[index];

    return {
      ringId: ring?.ringId ?? null,
      mutationId: ring?.mutationId ?? null,
    };
  });
}

function getFullBuildIdentity(build: BuildState): string {
  return JSON.stringify({
    panId: build.panId,
    panEnchantId: build.panEnchantId,

    shovelId: build.shovelId,

    necklaceId: build.necklaceId,
    necklaceMutationId: build.necklaceMutationId,

    charmId: build.charmId,
    charmMutationId: build.charmMutationId,

    rings: build.rings.map((ring) => ({
      ringId: ring.ringId ?? null,
      mutationId: ring.mutationId ?? null,
    })),

    museumSlots: build.museumSlots
      .slice()
      .sort((a, b) => a.slotId - b.slotId)
      .map((slot) => ({
        slotId: slot.slotId,
        mineralId: slot.mineralId ?? null,
        modifierId: slot.modifierId ?? null,
      })),
  });
}

function hasDuplicateMuseumMinerals(build: BuildState): boolean {
  const seenMineralIds = new Set<string>();

  for (const slot of build.museumSlots ?? []) {
    if (!slot.mineralId) {
      continue;
    }

    if (seenMineralIds.has(slot.mineralId)) {
      return true;
    }

    seenMineralIds.add(slot.mineralId);
  }

  return false;
}

function passesMaxStats(build: BuildState, request: OptimizerRequest): boolean {
  if (!request.maxStats) {
    return true;
  }

  const evaluated = evaluateBuild(build);

  for (const [stat, max] of Object.entries(request.maxStats)) {
    const value = evaluated.stats[stat as keyof typeof evaluated.stats];

    if (value !== undefined && value > (max ?? 0)) {
      return false;
    }
  }

  return true;
}

function passesMinStats(build: BuildState, request: OptimizerRequest): boolean {
  if (!request.minStats) {
    return true;
  }

  const evaluated = evaluateBuild(build);

  for (const [stat, min] of Object.entries(request.minStats)) {
    const value = evaluated.stats[stat as keyof typeof evaluated.stats];

    if (value !== undefined && value < (min ?? 0)) {
      return false;
    }
  }

  return true;
}

function passesOneTapConstraint(
  build: BuildState,
  request: OptimizerRequest,
): boolean {
  if (!request.forceOneTapBuilds) {
    return true;
  }

  return evaluateBuild(build).cycleData.digsRequired === 1;
}

function getOneTapConstraintScore(
  evaluated: ReturnType<typeof evaluateBuild>,
): number {
  const digsRequired = Number(evaluated.cycleData.digsRequired);

  if (digsRequired === 1) {
    return 1;
  }

  const capacity = Number(evaluated.stats.capacity ?? 0);
  const digStrength = Number(evaluated.stats.digStrength ?? 0);

  if (capacity <= 0 || digStrength <= 0) {
    return 0;
  }

  // One-tap is achieved when ceil(capacity / (1.5 * digStrength)) === 1,
  // which means capacity <= 1.5 * digStrength. The old score used
  // 1 / digsRequired, which was too coarse: every 2-tap build looked the same
  // even if one was barely short of one-tap and another was nowhere close.
  // Use the underlying progress ratio so the search preserves builds moving
  // toward the actual one-tap threshold.
  const thresholdProgress = (1.5 * digStrength) / capacity;

  if (!Number.isFinite(thresholdProgress) || thresholdProgress <= 0) {
    return 0;
  }

  const coarseProgress =
    Number.isFinite(digsRequired) && digsRequired > 1 ? 1 / digsRequired : 0;

  return Math.max(coarseProgress, Math.min(thresholdProgress, 1));
}

function isCandidateBuildValid(
  build: BuildState,
  request: OptimizerRequest,
): boolean {
  return (
    isBuildLegal(build) &&
    !hasDuplicateMuseumMinerals(build) &&
    passesMaxStats(build, request)
  );
}

function isFinalBuildValid(
  build: BuildState,
  request: OptimizerRequest,
): boolean {
  return (
    isCandidateBuildValid(build, request) &&
    passesMinStats(build, request) &&
    passesOneTapConstraint(build, request)
  );
}

function scoreCandidateBuild(
  build: BuildState,
  request: OptimizerRequest,
): number {
  return scoreBuild(evaluateBuild(build), request);
}

function scoreSearchBuild(
  build: BuildState,
  request: OptimizerRequest,
): number {
  const evaluated = evaluateBuild(build);
  const objectiveScore = scoreBuild(evaluated, request);
  const constraintStatus = getMinConstraintStatus(evaluated, request);
  const oneTapScore = request.forceOneTapBuilds
    ? getOneTapConstraintScore(evaluated)
    : 1;

  if (request.forceOneTapBuilds) {
    const oneTapBase = oneTapScore * 1_000_000_000_000;

    if (evaluated.cycleData.digsRequired !== 1) {
      return oneTapBase + objectiveScore;
    }

    if (!constraintStatus.hasConstraints) {
      return 1_000_000_000_000_000 + objectiveScore;
    }
  }

  if (!constraintStatus.hasConstraints) {
    return objectiveScore;
  }

  // Constraint-first, objective-second behavior:
  // - Invalid builds are ranked by how much deficit remains.
  // - Valid builds are ranked by the normal objective score.
  // This prevents the search from hovering around the minimum and lets any build
  // above the minimum compete normally by efficiency/secondary objectives.
  if (constraintStatus.passes) {
    return 1_000_000_000_000_000 + objectiveScore;
  }

  return (
    (1 - constraintStatus.deficitRatio) * 1_000_000_000_000 + objectiveScore
  );
}

function isBetterFinalBuild(
  candidate: BuildState,
  current: BuildState,
  request: OptimizerRequest,
): boolean {
  const candidateEvaluated = evaluateBuild(candidate);
  const currentEvaluated = evaluateBuild(current);

  const candidatePrimary = scoreBuild(candidateEvaluated, {
    ...request,
    secondaryObjective: undefined,
  });
  const currentPrimary = scoreBuild(currentEvaluated, {
    ...request,
    secondaryObjective: undefined,
  });

  const epsilon = 1e-9;

  if (candidatePrimary > currentPrimary + epsilon) {
    return true;
  }

  if (candidatePrimary < currentPrimary - epsilon) {
    return false;
  }

  const candidateFullScore = scoreBuild(candidateEvaluated, request);
  const currentFullScore = scoreBuild(currentEvaluated, request);

  return candidateFullScore > currentFullScore + epsilon;
}


function getModifierAffectedStats(modifier?: MuseumModifier | null): Set<string> {
  return new Set((modifier?.affects ?? []).map((stat) => String(stat)));
}

function modifierStrictlyDominates(
  candidate?: MuseumModifier | null,
  current?: MuseumModifier | null,
): boolean {
  if (!candidate || candidate.id === current?.id) {
    return false;
  }

  const candidateStats = getModifierAffectedStats(candidate);
  const currentStats = getModifierAffectedStats(current);

  if (candidateStats.size <= currentStats.size) {
    return false;
  }

  for (const stat of currentStats) {
    if (!candidateStats.has(stat)) {
      return false;
    }
  }

  return true;
}



const MUSEUM_MODIFIER_POLISH_UPGRADES: Record<string, string[]> = {
  voidtorn: ["perfect"],
  iridescent: ["treasured", "perfect"],
  crystalline: ["perfect"],
  electrified: ["lunar"],
  irradiated: ["mutated"],
  scorching: ["mutated"],
  shiny: ["cosmic"],
  pure: ["lunar"],
  glowing: ["lunar"],
};

function getMuseumModifierPolishTargets(
  current?: MuseumModifier | null,
): MuseumModifier[] {
  const targetIds = current?.id
    ? MUSEUM_MODIFIER_POLISH_UPGRADES[current.id] ?? []
    : [];

  if (targetIds.length === 0) {
    return [];
  }

  return targetIds
    .map((targetId) =>
      museumModifiers.find((modifier) => modifier.id === targetId),
    )
    .filter(Boolean) as MuseumModifier[];
}

function mutationStrictlyDominates(
  candidateMutationId: string | null | undefined,
  currentMutationId: string | null | undefined,
): boolean {
  if (!candidateMutationId || candidateMutationId === currentMutationId) {
    return false;
  }

  const candidate = mutations.find(
    (mutation) => mutation.id === candidateMutationId,
  ) as any;
  const current = currentMutationId
    ? (mutations.find((mutation) => mutation.id === currentMutationId) as any)
    : null;

  if (!candidate) {
    return false;
  }

  const candidateMultiplier = Number(candidate.multiplier ?? 1);
  const currentMultiplier = Number(current?.multiplier ?? 1);
  const candidateFlat = candidate.flat ?? {};
  const currentFlat = current?.flat ?? {};

  const allFlatStats = new Set([
    ...Object.keys(candidateFlat),
    ...Object.keys(currentFlat),
  ]);

  const hasStrictlyBetterMultiplier = candidateMultiplier > currentMultiplier;
  const hasWorseMultiplier = candidateMultiplier < currentMultiplier;

  if (hasWorseMultiplier) {
    return false;
  }

  let hasStrictlyBetterFlat = false;

  for (const stat of allFlatStats) {
    const candidateValue = Number(candidateFlat[stat] ?? 0);
    const currentValue = Number(currentFlat[stat] ?? 0);

    if (candidateValue < currentValue) {
      return false;
    }

    if (candidateValue > currentValue) {
      hasStrictlyBetterFlat = true;
    }
  }

  return hasStrictlyBetterMultiplier || hasStrictlyBetterFlat;
}

function polishRingMutationsForSelectedRings(
  build: BuildState,
  request: OptimizerRequest,
  deadline: number,
): BuildState {
  let polished = build;
  const mutationIds = getAvailableMutationIds(request).filter(
    (mutationId): mutationId is string => Boolean(mutationId),
  );

  if (mutationIds.length === 0) {
    return polished;
  }

  for (let ringIndex = 0; ringIndex < polished.rings.length; ringIndex += 1) {
    if (Date.now() > deadline) {
      return polished;
    }

    if (request.lockedSlots?.rings?.[ringIndex]) {
      continue;
    }

    const currentRing = polished.rings[ringIndex];

    if (!currentRing?.ringId) {
      continue;
    }

    let bestBuild = polished;

    for (const mutationId of mutationIds) {
      if (Date.now() > deadline) {
        return polished;
      }

      if (mutationId === currentRing.mutationId) {
        continue;
      }

      const updatedRings = polished.rings.map((ring, index) =>
        index === ringIndex
          ? {
              ...ring,
              mutationId,
            }
          : {
              ...ring,
            },
      );

      const candidateBuild: BuildState = {
        ...polished,
        rings: updatedRings,
      };

      if (!isFinalBuildValid(candidateBuild, request)) {
        continue;
      }

      if (
        isBetterFinalBuild(candidateBuild, bestBuild, request) ||
        mutationStrictlyDominates(mutationId, currentRing.mutationId)
      ) {
        bestBuild = candidateBuild;
      }
    }

    polished = bestBuild;
  }

  return polished;
}

function polishMuseumModifiersForSelectedMinerals(
  build: BuildState,
  request: OptimizerRequest,
  deadline: number,
): BuildState {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;
  let polished = build;

  for (let slotIndex = 0; slotIndex < (polished.museumSlots ?? []).length; slotIndex += 1) {
    if (Date.now() > deadline) {
      return polished;
    }

    if (request.lockedSlots?.museumSlots?.[slotIndex]) {
      continue;
    }

    const slot = polished.museumSlots[slotIndex];

    if (!slot?.mineralId) {
      continue;
    }

    const mineral = museumMinerals.find(
      (museumMineral) => museumMineral.id === slot.mineralId,
    ) as MuseumMineral | undefined;

    if (!mineral) {
      continue;
    }

    const availableModifiers = [
      null,
      ...(museumModifiers.filter((modifier) =>
        isItemAccessible(modifier as any, accessSettings),
      ) as MuseumModifier[]),
    ];

    let bestBuild = polished;

    const currentModifier = museumModifiers.find(
      (modifier) => modifier.id === slot.modifierId,
    ) as MuseumModifier | undefined;

    const ruleTargetIds = new Set(
      getMuseumModifierPolishTargets(currentModifier).map(
        (modifier) => modifier.id,
      ),
    );

    for (const modifier of availableModifiers) {
      if (Date.now() > deadline) {
        return polished;
      }

      if (!canUseMuseumModifier(mineral, modifier)) {
        continue;
      }

      const updatedMuseumSlots = polished.museumSlots.map((currentSlot, index) =>
        index === slotIndex
          ? {
              ...currentSlot,
              modifierId: modifier?.id ?? null,
            }
          : currentSlot,
      );

      const candidateBuild: BuildState = {
        ...polished,
        museumSlots: updatedMuseumSlots,
      };

      if (!isFinalBuildValid(candidateBuild, request)) {
        continue;
      }

      const isRuleUpgrade = modifier ? ruleTargetIds.has(modifier.id) : false;

      if (isRuleUpgrade) {
        if (
          getFullBuildIdentity(bestBuild) === getFullBuildIdentity(polished) ||
          isBetterFinalBuild(candidateBuild, bestBuild, request)
        ) {
          bestBuild = candidateBuild;
        }

        continue;
      }

      if (
        modifierStrictlyDominates(modifier, currentModifier) ||
        isBetterFinalBuild(candidateBuild, bestBuild, request)
      ) {
        bestBuild = candidateBuild;
      }
    }

    polished = bestBuild;
  }

  return polished;
}

function polishFinalBuild(
  build: BuildState,
  request: OptimizerRequest,
  stages: FullBuildStage[],
  deadline: number,
): BuildState {
  let polished = build;

  // Keep this as a small local cleanup, not a second full optimizer pass. The
  // first version re-opened every option for every result candidate and could
  // run long enough for the worker timeout to terminate the optimizer.
  for (let pass = 0; pass < 1; pass += 1) {
    let changed = false;

    for (const stage of stages) {
      if (Date.now() > deadline) {
        return polished;
      }

      // Ring-set and museum-set option builders are intentionally broad. Do not
      // run them again during final polish; they can consume enough time to make
      // the worker hit its timeout. The main beam search already includes these
      // set stages.
      if (stage.name === "rings" || stage.name === "museum") {
        continue;
      }

      const stageOptions = rankStageOptions(
        stage.buildOptions(polished, request),
        request,
        MAX_POLISH_STAGE_OPTIONS,
      ).filter((option) => isFinalBuildValid(option.build, request));

      let bestBuild = polished;

      for (const option of stageOptions) {
        if (Date.now() > deadline) {
          return polished;
        }

        if (isBetterFinalBuild(option.build, bestBuild, request)) {
          bestBuild = option.build;
        }
      }

      if (getFullBuildIdentity(bestBuild) !== getFullBuildIdentity(polished)) {
        polished = bestBuild;
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  polished = polishRingMutationsForSelectedRings(polished, request, deadline);

  return polishMuseumModifiersForSelectedMinerals(polished, request, deadline);
}

function makeFullBuildResult(
  build: BuildState,
  request: OptimizerRequest,
): OptimizerResult {
  const evaluated = evaluateBuild(build);

  return {
    candidate: {
      slot: "fullBuild",
      label: "Full Build",
      build,
    },

    build,

    evaluated,

    score: scoreBuild(evaluated, request),
  };
}

function uniqueStageOptions(options: StageOption[]): StageOption[] {
  return Array.from(
    new Map(
      options.map((option) => [getFullBuildIdentity(option.build), option]),
    ).values(),
  );
}

function rankStageOptions(
  options: StageOption[],
  request: OptimizerRequest,
  limit: number,
): StageOption[] {
  const scored = uniqueStageOptions(options)
    .filter((option) => isCandidateBuildValid(option.build, request))
    .map((option) => ({
      option,
      score: scoreSearchBuild(option.build, request),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ option }) => option);
}

function isPoolBuildValid(
  build: BuildState,
  request: OptimizerRequest,
): boolean {
  // Pool construction should remove impossible/legal-invalid options, but it
  // should not apply desired min/max or one-tap filters yet. A build can require
  // multiple coordinated slot changes to satisfy those constraints, so applying
  // max/min checks to one stage at a time can empty a pool and prevent valid full
  // builds from ever being constructed.
  return isBuildLegal(build) && !hasDuplicateMuseumMinerals(build);
}

function rankPoolStageOptions(
  options: StageOption[],
  request: OptimizerRequest,
  limit: number,
): StageOption[] {
  const scored = uniqueStageOptions(options)
    .filter((option) => isPoolBuildValid(option.build, request))
    .map((option) => ({
      option,
      score: scoreSearchBuild(option.build, request),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ option }) => option);
}

function ensureStagePoolHasFallback(
  options: StageOption[],
  fallbackBuild: BuildState,
  label: string,
): StageOption[] {
  if (options.length > 0) {
    return options;
  }

  return [
    {
      build: fallbackBuild,
      label,
    },
  ];
}


function rankConstraintStageOptions(
  options: StageOption[],
  request: OptimizerRequest,
  limit: number,
): StageOption[] {
  const scored = uniqueStageOptions(options)
    .filter((option) => isCandidateBuildValid(option.build, request))
    .map((option) => ({
      option,
      score: scoreConstraintTargetBuild(option.build, request),
    }))
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(({ option }) => option);
}

function computeObjectiveRanges(
  initialBuild: BuildState,
  request: OptimizerRequest,
  stages: FullBuildStage[],
): OptimizerRequest["objectiveRanges"] {
  const objectives = [request.objective, request.secondaryObjective].filter(
    (objective): objective is NonNullable<typeof objective> =>
      Boolean(objective),
  );

  const uniqueObjectives = Array.from(new Set(objectives));

  if (uniqueObjectives.length === 0) {
    return undefined;
  }

  const currentEvaluated = evaluateBuild(initialBuild);

  const ranges: OptimizerRequest["objectiveRanges"] = {};

  for (const objective of uniqueObjectives) {
    ranges[objective] = {
      current: objectiveValue(currentEvaluated, objective),
      best: objectiveValue(currentEvaluated, objective),
    };
  }

  const seen = new Set<string>([getFullBuildIdentity(initialBuild)]);

  for (const stage of stages) {
    // Ring-set and museum-set builders are intentionally broad. Calling them
    // while only estimating objective ranges can consume a large chunk of the
    // worker budget, especially on mobile. Ranges are only normalization hints,
    // so use the lighter direct stages here and let final scoring use raw values
    // as tie-breakers.
    if (stage.name === "rings" || stage.name === "museum") {
      continue;
    }

    for (const option of stage.buildOptions(initialBuild, request)) {
      const identity = getFullBuildIdentity(option.build);

      if (seen.has(identity) || !isCandidateBuildValid(option.build, request)) {
        continue;
      }

      seen.add(identity);

      const evaluated = evaluateBuild(option.build);

      for (const objective of uniqueObjectives) {
        const value = objectiveValue(evaluated, objective);
        const range = ranges[objective];

        if (range && value > range.best) {
          range.best = value;
        }
      }
    }
  }

  return ranges;
}

function mergeFrontierCandidates(
  candidates: ScoredBuild[],
  limit: number,
): ScoredBuild[] {
  const unique = new Map<string, ScoredBuild>();

  for (const candidate of candidates) {
    const identity = getFullBuildIdentity(candidate.build);
    const existing = unique.get(identity);

    if (!existing || candidate.score > existing.score) {
      unique.set(identity, candidate);
    }
  }

  return Array.from(unique.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function runConstraintRescueSearch(
  initialBuild: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
  stages: FullBuildStage[],
): ScoredBuild[] {
  if (!hasMinStats(request) && !request.forceOneTapBuilds) {
    return [];
  }

  // This fallback is intentionally more constraint-driven than the normal beam.
  // It exists for cases like desired sizeBoost >= 1500 where the best valid build
  // can be much worse for efficiency, so objective-first pruning may never keep it.
  const rescueBeamWidth = request.forceOneTapBuilds ? 120 : 72;
  const rescuePerStageLimit = request.forceOneTapBuilds ? 48 : 36;

  let rescueFrontier: ScoredBuild[] = [
    {
      build: initialBuild,
      score: scoreConstraintTargetBuild(initialBuild, request),
      label: "Constraint rescue: current build",
    },
  ];

  for (const stage of stages) {
    const stageCandidates: ScoredBuild[] = [];

    for (const frontierBuild of rescueFrontier) {
      const rankedOptions = rankConstraintStageOptions(
        stage.buildOptions(frontierBuild.build, request),
        request,
        rescuePerStageLimit,
      );

      for (const option of rankedOptions) {
        stageCandidates.push({
          build: option.build,
          score: scoreConstraintTargetBuild(option.build, request),
          label: `${stage.name}: ${option.label}`,
        });
      }
    }

    rescueFrontier = mergeFrontierCandidates(stageCandidates, rescueBeamWidth);

    if (rescueFrontier.length === 0) {
      return [];
    }
  }

  return rescueFrontier;
}

function buildResultsOrConstraintRescue(
  frontier: ScoredBuild[],
  request: OptimizerRequest,
  baselineScore: number,
  originalBuildHash: string,
  originalBuildIdentity: string,
  topResults: number,
  requireBaselineImprovement: boolean,
  initialBuild: BuildState,
  ringSlotLimit: number,
  stages: FullBuildStage[],
): OptimizerResult[] {
  const primaryResults = buildFinalResultsFromFrontier(
    frontier,
    request,
    baselineScore,
    originalBuildHash,
    originalBuildIdentity,
    topResults,
    requireBaselineImprovement,
    stages,
  );

  if (
    primaryResults.length > 0 ||
    (!hasMinStats(request) && !request.forceOneTapBuilds)
  ) {
    return primaryResults;
  }

  const rescueFrontier = runConstraintRescueSearch(
    initialBuild,
    request,
    ringSlotLimit,
    stages,
  );

  return buildFinalResultsFromFrontier(
    rescueFrontier,
    request,
    baselineScore,
    originalBuildHash,
    originalBuildIdentity,
    topResults,
    false,
    stages,
  );
}

function getAvailableMutationIds(
  request: OptimizerRequest,
): Array<string | null> {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;
  const searchProfile = getOptimizerSearchProfile(accessSettings);

  if (!areMutationsAccessible(accessSettings)) {
    return [null];
  }

  const mutationIds = mutations
    .filter(
      (mutation) => !mutation.limitedTime || accessSettings.includeLimitedTime,
    )
    .map((mutation) => mutation.id)
    .filter((mutationId) =>
      isOptimizerMutationAllowed(mutationId, searchProfile),
    );

  return isOptimizerMutationAllowed(null, searchProfile)
    ? [null, ...mutationIds]
    : mutationIds;
}

function buildPanOptions(
  build: BuildState,
  request: OptimizerRequest,
): StageOption[] {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;

  const options: StageOption[] = [
    {
      label: "Keep current pan setup",
      build,
    },
  ];

  if (request.lockedSlots?.pan) {
    return options;
  }

  const availablePans = pans.filter((pan) =>
    isItemAccessible(pan as any, accessSettings),
  );

  const searchProfile = getOptimizerSearchProfile(accessSettings);
  const currentEnchantAllowed = isOptimizerEnchantAllowed(
    build.panEnchantId,
    searchProfile,
  );

  const enchantIds: Array<string | null> = [
    ...(currentEnchantAllowed ? [null] : []),
    ...enchants
      .map((enchant) => enchant.id)
      .filter((enchantId) => isOptimizerEnchantAllowed(enchantId, searchProfile)),
  ];

  for (const pan of availablePans) {
    for (const enchantId of enchantIds) {
      options.push({
        label: `${pan.name}${
          enchantId
            ? ` + ${enchants.find((enchant) => enchant.id === enchantId)?.name}`
            : ""
        }`,
        build: {
          ...build,
          panId: pan.id,
          panEnchantId: enchantId,
        },
      });
    }
  }

  return options;
}

function buildShovelOptions(
  build: BuildState,
  request: OptimizerRequest,
): StageOption[] {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;

  const options: StageOption[] = [
    {
      label: "Keep current shovel",
      build,
    },
  ];

  if (request.lockedSlots?.shovel) {
    return options;
  }

  for (const shovel of shovels.filter(
    (item) =>
      isItemAccessible(item as any, accessSettings) &&
      isOptimizerShovelAllowed(item as any, accessSettings),
  )) {
    options.push({
      label: shovel.name,
      build: {
        ...build,
        shovelId: shovel.id,
      },
    });
  }

  return options;
}

function buildAccessoryOptions(
  build: BuildState,
  request: OptimizerRequest,
  slot: "necklace" | "charm",
): StageOption[] {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;
  const searchProfile = getOptimizerSearchProfile(accessSettings);

  const locked =
    slot === "necklace"
      ? request.lockedSlots?.necklace
      : request.lockedSlots?.charm;

  const options: StageOption[] = [];
  const items = slot === "necklace" ? necklaces : charms;
  const currentItemId = slot === "necklace" ? build.necklaceId : build.charmId;
  const currentMutationId =
    slot === "necklace" ? build.necklaceMutationId : build.charmMutationId;
  const currentItem = items.find((item) => item.id === currentItemId);

  const currentSetupAllowed =
    !currentItem ||
    (isOptimizerAccessoryAllowed(currentItem as any, searchProfile) &&
      isOptimizerMutationAllowed(currentMutationId, searchProfile));

  if (locked || currentSetupAllowed) {
    options.push({
      label: `Keep current ${slot}`,
      build,
    });
  }

  if (locked) {
    return options;
  }

  const mutationIds = getAvailableMutationIds(request);

  for (const item of items.filter(
    (item) =>
      isItemAccessible(item as any, accessSettings) &&
      isOptimizerAccessoryAllowed(item as any, searchProfile),
  )) {
    for (const mutationId of mutationIds) {
      options.push({
        label: `${item.name}${
          mutationId
            ? ` + ${mutations.find((mutation) => mutation.id === mutationId)?.name}`
            : ""
        }`,
        build:
          slot === "necklace"
            ? {
                ...build,
                necklaceId: item.id,
                necklaceMutationId: mutationId,
              }
            : {
                ...build,
                charmId: item.id,
                charmMutationId: mutationId,
              },
      });
    }
  }

  return options;
}

function buildRingOptions(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
  ringIndex: number,
): StageOption[] {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;
  const searchProfile = getOptimizerSearchProfile(accessSettings);

  const options: StageOption[] = [];
  const currentRing = build.rings[ringIndex];
  const currentRingItem = rings.find((ring) => ring.id === currentRing?.ringId);
  const currentSetupAllowed =
    !currentRingItem ||
    (isOptimizerAccessoryAllowed(currentRingItem as any, searchProfile) &&
      isOptimizerMutationAllowed(currentRing?.mutationId, searchProfile));

  if (request.lockedSlots?.rings?.[ringIndex] || currentSetupAllowed) {
    options.push({
      label: `Keep ring ${ringIndex + 1}`,
      build,
    });
  }

  if (request.lockedSlots?.rings?.[ringIndex]) {
    return options;
  }

  const mutationIds = getAvailableMutationIds(request);

  const availableRings = rings.filter(
    (ring) =>
      isItemAccessible(ring as any, accessSettings) &&
      isOptimizerAccessoryAllowed(ring as any, searchProfile),
  );

  for (const ring of availableRings) {
    for (const mutationId of mutationIds) {
      const updatedRings = cloneRings(build, ringSlotLimit);

      updatedRings[ringIndex] = {
        ringId: ring.id,
        mutationId,
      };

      options.push({
        label: `Ring ${ringIndex + 1}: ${ring.name}${
          mutationId
            ? ` + ${mutations.find((mutation) => mutation.id === mutationId)?.name}`
            : ""
        }`,
        build: {
          ...build,
          rings: updatedRings,
        },
      });
    }
  }

  return options;
}

function buildMuseumOptions(
  build: BuildState,
  request: OptimizerRequest,
  slot: MuseumSlotSelection,
): StageOption[] {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;

  const options: StageOption[] = [
    {
      label: `Keep museum slot ${slot.slotId}`,
      build,
    },
  ];

  const museumSlotIndex = build.museumSlots.findIndex(
    (museumSlot) => museumSlot.slotId === slot.slotId,
  );

  if (request.lockedSlots?.museumSlots?.[museumSlotIndex]) {
    return options;
  }

  const availableMinerals = museumMinerals.filter(
    (mineral) =>
      mineral.rarity === slot.rarity &&
      isMuseumMineralAccessible(mineral as any, accessSettings),
  ) as MuseumMineral[];

  const availableModifiers = [
    null,
    ...(museumModifiers.filter((modifier) =>
      isItemAccessible(modifier as any, accessSettings),
    ) as MuseumModifier[]),
  ];

  for (const mineral of availableMinerals) {
    for (const modifier of availableModifiers) {
      if (!canUseMuseumModifier(mineral, modifier)) {
        continue;
      }

      const updatedMuseumSlots = build.museumSlots.map((currentSlot) =>
        currentSlot.slotId === slot.slotId
          ? {
              ...currentSlot,
              mineralId: mineral.id,
              modifierId: modifier?.id ?? null,
            }
          : currentSlot,
      );

      options.push({
        label: `Museum ${slot.slotId}: ${mineral.name}${
          modifier ? ` + ${modifier.name}` : ""
        }`,
        build: {
          ...build,
          museumSlots: updatedMuseumSlots,
        },
      });
    }
  }

  return options;
}

function buildRingSetOptions(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
): StageOption[] {
  const keepCurrent: StageOption = {
    label: "Keep current ring set",
    build,
  };

  if (request.lockedSlots?.rings?.slice(0, ringSlotLimit).every(Boolean)) {
    return [keepCurrent];
  }

  const perSlotOptions: RingSelection[][] = [];
  const useOverhaulSearch = shouldUseOverhaulSearch(request);
  const singleSlotLimit = useOverhaulSearch
    ? request.mode === "exhaustive"
      ? 40
      : request.mode === "fast"
        ? 22
        : 30
    : request.mode === "exhaustive"
      ? 24
      : request.mode === "fast"
        ? 12
        : 18;

  for (let index = 0; index < ringSlotLimit; index += 1) {
    if (isSearchDeadlineNear(request)) {
      break;
    }

    if (request.lockedSlots?.rings?.[index]) {
      perSlotOptions.push([cloneRings(build, ringSlotLimit)[index]]);
      continue;
    }

    const currentKey = getRingOptionKey(build, index);
    const rankedOptions = rankStageOptions(
      buildRingOptions(build, request, ringSlotLimit, index),
      request,
      singleSlotLimit,
    );

    const uniqueOptions = new Map<string, RingSelection>();

    for (const option of rankedOptions) {
      const key = getRingOptionKey(option.build, index);
      uniqueOptions.set(key, cloneRings(option.build, ringSlotLimit)[index]);
    }

    if (!uniqueOptions.has(currentKey)) {
      uniqueOptions.set(currentKey, cloneRings(build, ringSlotLimit)[index]);
    }

    perSlotOptions.push(Array.from(uniqueOptions.values()));
  }

  let frontier: Array<{
    rings: RingSelection[];
    build: BuildState;
    score: number;
  }> = [
    {
      rings: cloneRings(build, ringSlotLimit),
      build,
      score: scoreSearchBuild(build, request),
    },
  ];

  const frontierLimit = useOverhaulSearch
    ? request.mode === "exhaustive"
      ? 160
      : request.mode === "fast"
        ? 72
        : 110
    : request.mode === "exhaustive"
      ? 120
      : request.mode === "fast"
        ? 48
        : 80;

  for (let index = 0; index < ringSlotLimit; index += 1) {
    if (isSearchDeadlineNear(request)) {
      break;
    }

    const next = new Map<
      string,
      { rings: RingSelection[]; build: BuildState; score: number }
    >();

    for (const frontierEntry of frontier) {
      if (isSearchDeadlineNear(request)) {
        break;
      }

      for (const ringOption of perSlotOptions[index]) {
        if (isSearchDeadlineNear(request, 750)) {
          break;
        }

        const ringsForBuild = frontierEntry.rings.map((ring) => ({ ...ring }));
        ringsForBuild[index] = { ...ringOption };

        const candidateBuild: BuildState = {
          ...build,
          rings: ringsForBuild,
        };

        if (!isCandidateBuildValid(candidateBuild, request)) {
          continue;
        }

        const key = getRingSetKey(candidateBuild, ringSlotLimit);
        const score = scoreSearchBuild(candidateBuild, request);
        const existing = next.get(key);

        if (!existing || score > existing.score) {
          next.set(key, {
            rings: ringsForBuild,
            build: candidateBuild,
            score,
          });
        }
      }
    }

    frontier = Array.from(next.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, frontierLimit);

    if (frontier.length === 0) {
      return [keepCurrent];
    }
  }

  const options = frontier.map((entry) => ({
    label: "Legal ring set",
    build: entry.build,
  }));

  return uniqueStageOptions([keepCurrent, ...options]);
}

function buildMuseumSetOptions(
  build: BuildState,
  request: OptimizerRequest,
): StageOption[] {
  const keepCurrent: StageOption = {
    label: "Keep current museum set",
    build,
  };

  const museumSlots = build.museumSlots ?? [];

  if (museumSlots.length === 0) {
    return [keepCurrent];
  }

  const allSlotsLocked = museumSlots.every(
    (_, index) => request.lockedSlots?.museumSlots?.[index],
  );

  if (allSlotsLocked) {
    return [keepCurrent];
  }

  const useOverhaulSearch = shouldUseOverhaulSearch(request);
  const singleSlotLimit = useOverhaulSearch
    ? request.mode === "exhaustive"
      ? 40
      : request.mode === "fast"
        ? 22
        : 30
    : request.mode === "exhaustive"
      ? 28
      : request.mode === "fast"
        ? 14
        : 20;
  const perSlotOptions: MuseumSlotSelection[][] = [];

  for (const slot of museumSlots) {
    if (isSearchDeadlineNear(request)) {
      break;
    }

    const slotIndex = museumSlots.findIndex(
      (museumSlot) => museumSlot.slotId === slot.slotId,
    );

    if (request.lockedSlots?.museumSlots?.[slotIndex]) {
      perSlotOptions.push([slot]);
      continue;
    }

    const rankedOptions = rankStageOptions(
      buildMuseumOptions(build, request, slot),
      request,
      singleSlotLimit,
    );

    const uniqueOptions = new Map<string, MuseumSlotSelection>();

    for (const option of rankedOptions) {
      const updatedSlot = option.build.museumSlots.find(
        (museumSlot) => museumSlot.slotId === slot.slotId,
      );

      if (!updatedSlot) {
        continue;
      }

      uniqueOptions.set(
        `${updatedSlot.slotId}:${getNullableId(updatedSlot.mineralId)}|${getNullableId(updatedSlot.modifierId)}`,
        updatedSlot,
      );
    }

    uniqueOptions.set(
      `${slot.slotId}:${getNullableId(slot.mineralId)}|${getNullableId(slot.modifierId)}`,
      slot,
    );

    perSlotOptions.push(Array.from(uniqueOptions.values()));
  }

  let frontier: Array<{
    museumSlots: MuseumSlotSelection[];
    build: BuildState;
    score: number;
  }> = [
    {
      museumSlots,
      build,
      score: scoreSearchBuild(build, request),
    },
  ];

  const frontierLimit = useOverhaulSearch
    ? request.mode === "exhaustive"
      ? 160
      : request.mode === "fast"
        ? 72
        : 110
    : request.mode === "exhaustive"
      ? 120
      : request.mode === "fast"
        ? 48
        : 80;

  for (let index = 0; index < museumSlots.length; index += 1) {
    if (isSearchDeadlineNear(request)) {
      break;
    }

    const next = new Map<
      string,
      { museumSlots: MuseumSlotSelection[]; build: BuildState; score: number }
    >();

    for (const frontierEntry of frontier) {
      if (isSearchDeadlineNear(request)) {
        break;
      }

      for (const slotOption of perSlotOptions[index]) {
        if (isSearchDeadlineNear(request, 750)) {
          break;
        }

        const updatedMuseumSlots = frontierEntry.museumSlots.map((slot) =>
          slot.slotId === slotOption.slotId ? { ...slotOption } : { ...slot },
        );

        const candidateBuild: BuildState = {
          ...build,
          museumSlots: updatedMuseumSlots,
        };

        if (!isCandidateBuildValid(candidateBuild, request)) {
          continue;
        }

        const key = getMuseumSetKey(candidateBuild);
        const score = scoreSearchBuild(candidateBuild, request);
        const existing = next.get(key);

        if (!existing || score > existing.score) {
          next.set(key, {
            museumSlots: updatedMuseumSlots,
            build: candidateBuild,
            score,
          });
        }
      }
    }

    frontier = Array.from(next.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, frontierLimit);

    if (frontier.length === 0) {
      return [keepCurrent];
    }
  }

  const options = frontier.map((entry) => ({
    label: "Legal museum set",
    build: entry.build,
  }));

  return uniqueStageOptions([keepCurrent, ...options]);
}

function makeFullBuildStages(
  initialBuild: BuildState,
  ringSlotLimit: number,
): FullBuildStage[] {
  const stages: FullBuildStage[] = [
    {
      name: "pan",
      buildOptions: (build, request) => buildPanOptions(build, request),
      optionKey: (build) =>
        `${getNullableId(build.panId)}|${getNullableId(build.panEnchantId)}`,
    },
    {
      name: "shovel",
      buildOptions: (build, request) => buildShovelOptions(build, request),
      optionKey: (build) => getNullableId(build.shovelId),
    },
    {
      name: "necklace",
      buildOptions: (build, request) =>
        buildAccessoryOptions(build, request, "necklace"),
      optionKey: (build) =>
        `${getNullableId(build.necklaceId)}|${getNullableId(build.necklaceMutationId)}`,
    },
    {
      name: "charm",
      buildOptions: (build, request) =>
        buildAccessoryOptions(build, request, "charm"),
      optionKey: (build) =>
        `${getNullableId(build.charmId)}|${getNullableId(build.charmMutationId)}`,
    },
  ];

  stages.push({
    name: "rings",
    buildOptions: (build, request) =>
      buildRingSetOptions(build, request, ringSlotLimit),
    optionKey: (build) => getRingSetKey(build, ringSlotLimit),
  });

  stages.push({
    name: "museum",
    buildOptions: (build, request) => buildMuseumSetOptions(build, request),
    optionKey: (build) => getMuseumSetKey(build),
  });

  return stages;
}

function buildFinalResultsFromFrontier(
  frontier: ScoredBuild[],
  request: OptimizerRequest,
  baselineScore: number,
  originalBuildHash: string,
  originalBuildIdentity: string,
  topResults: number,
  requireBaselineImprovement: boolean,
  stages: FullBuildStage[],
): OptimizerResult[] {
  const acceptedBuildHashes = new Set<string>();

  const acceptedBuildIdentities = new Set<string>();

  const finalResults: OptimizerResult[] = [];

  const polishDeadline = Date.now() + FINAL_POLISH_TIME_BUDGET_MS;

  const candidatesToReview = frontier
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(topResults * 3, MAX_FINAL_POLISH_CANDIDATES));

  for (const candidate of candidatesToReview) {
    const polishedBuild = polishFinalBuild(
      candidate.build,
      request,
      stages,
      polishDeadline,
    );

    const finalObjectiveScore = scoreCandidateBuild(polishedBuild, request);

    if (requireBaselineImprovement && finalObjectiveScore <= baselineScore) {
      continue;
    }

    const finalBuildHash = buildHash(polishedBuild);

    const finalBuildIdentity = getFullBuildIdentity(polishedBuild);

    if (
      finalBuildHash === originalBuildHash ||
      finalBuildIdentity === originalBuildIdentity ||
      acceptedBuildHashes.has(finalBuildHash) ||
      acceptedBuildIdentities.has(finalBuildIdentity)
    ) {
      continue;
    }

    if (!isFinalBuildValid(polishedBuild, request)) {
      continue;
    }

    acceptedBuildHashes.add(finalBuildHash);

    acceptedBuildIdentities.add(finalBuildIdentity);

    finalResults.push(makeFullBuildResult(polishedBuild, request));

    if (finalResults.length >= topResults) {
      break;
    }
  }

  return finalResults.sort((a, b) => b.score - a.score);
}


interface GraspSearchConfig {
  poolLimit: number;
  iterations: number;
  restrictedCandidateListSize: number;
  explorationRate: number;
}

const GRASP_CONFIG: Record<OptimizerMode, GraspSearchConfig> = {
  fast: {
    poolLimit: 72,
    iterations: 700,
    restrictedCandidateListSize: 14,
    explorationRate: 0.12,
  },

  balanced: {
    poolLimit: 180,
    iterations: 2800,
    restrictedCandidateListSize: 32,
    explorationRate: 0.16,
  },

  exhaustive: {
    poolLimit: 300,
    iterations: 7000,
    restrictedCandidateListSize: 48,
    explorationRate: 0.2,
  },
};

interface GraspOptionPools {
  pan: StageOption[];
  shovel: StageOption[];
  necklace: StageOption[];
  charm: StageOption[];
  rings: StageOption[];
  museum: StageOption[];
}

function hashString(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createSeededRng(seed: string): () => number {
  let state = hashString(seed) || 0x9e3779b9;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function getGraspSeed(build: BuildState, request: OptimizerRequest): string {
  return JSON.stringify({
    build: getFullBuildIdentity(build),
    objective: request.objective,
    secondaryObjective: request.secondaryObjective ?? null,
    minStats: request.minStats ?? {},
    maxStats: request.maxStats ?? {},
    forceOneTapBuilds: Boolean(request.forceOneTapBuilds),
    mode: request.mode ?? "balanced",
    accessRegion: request.accessSettings?.region ?? null,
    includeLimitedTime: Boolean(request.accessSettings?.includeLimitedTime),
    specialAccess: request.accessSettings?.specialAccess ?? {},
    lockedSlots: request.lockedSlots ?? {},
  });
}

function mergeStageChoice(
  build: BuildState,
  choice: StageOption,
  stageName: keyof GraspOptionPools,
  ringSlotLimit: number,
): BuildState {
  switch (stageName) {
    case "pan":
      return {
        ...build,
        panId: choice.build.panId,
        panEnchantId: choice.build.panEnchantId,
      };

    case "shovel":
      return {
        ...build,
        shovelId: choice.build.shovelId,
      };

    case "necklace":
      return {
        ...build,
        necklaceId: choice.build.necklaceId,
        necklaceMutationId: choice.build.necklaceMutationId,
      };

    case "charm":
      return {
        ...build,
        charmId: choice.build.charmId,
        charmMutationId: choice.build.charmMutationId,
      };

    case "rings":
      return {
        ...build,
        rings: cloneRings(choice.build, ringSlotLimit),
      };

    case "museum":
      return {
        ...build,
        museumSlots: choice.build.museumSlots.map((slot) => ({ ...slot })),
      };
  }
}

function addUniqueStageOptions(
  options: StageOption[],
  additions: StageOption[],
  limit: number,
): StageOption[] {
  const merged = new Map<string, StageOption>();

  for (const option of [...options, ...additions]) {
    merged.set(getFullBuildIdentity(option.build), option);
  }

  return Array.from(merged.values()).slice(0, limit);
}

function buildGraspOptionPools(
  initialBuild: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
  config: GraspSearchConfig,
): GraspOptionPools {
  const directLimit = config.poolLimit;
  const setLimit = Math.max(config.poolLimit, config.restrictedCandidateListSize * 4);

  const pan = rankPoolStageOptions(
    buildPanOptions(initialBuild, request),
    request,
    directLimit,
  );
  const shovel = rankPoolStageOptions(
    buildShovelOptions(initialBuild, request),
    request,
    directLimit,
  );
  const necklace = rankPoolStageOptions(
    buildAccessoryOptions(initialBuild, request, "necklace"),
    request,
    directLimit,
  );
  const charm = rankPoolStageOptions(
    buildAccessoryOptions(initialBuild, request, "charm"),
    request,
    directLimit,
  );
  const rings = rankPoolStageOptions(
    buildRingSetOptions(initialBuild, request, ringSlotLimit),
    request,
    setLimit,
  );
  const museum = rankPoolStageOptions(
    buildMuseumSetOptions(initialBuild, request),
    request,
    setLimit,
  );

  return {
    pan: ensureStagePoolHasFallback(addUniqueStageOptions([], pan, directLimit), initialBuild, "Current pan"),
    shovel: ensureStagePoolHasFallback(addUniqueStageOptions([], shovel, directLimit), initialBuild, "Current shovel"),
    necklace: ensureStagePoolHasFallback(addUniqueStageOptions([], necklace, directLimit), initialBuild, "Current necklace"),
    charm: ensureStagePoolHasFallback(addUniqueStageOptions([], charm, directLimit), initialBuild, "Current charm"),
    rings: ensureStagePoolHasFallback(addUniqueStageOptions([], rings, setLimit), initialBuild, "Current rings"),
    museum: ensureStagePoolHasFallback(addUniqueStageOptions([], museum, setLimit), initialBuild, "Current museum"),
  };
}

function pickGraspOption(
  options: StageOption[],
  rng: () => number,
  config: GraspSearchConfig,
): StageOption {
  if (options.length === 0) {
    throw new Error("GRASP option pool was empty after fallback construction");
  }

  if (options.length === 1) {
    return options[0];
  }

  const useExploration = rng() < config.explorationRate;
  const candidateCount = useExploration
    ? options.length
    : Math.min(options.length, config.restrictedCandidateListSize);

  let totalWeight = 0;

  for (let index = 0; index < candidateCount; index += 1) {
    totalWeight += 1 / Math.pow(index + 1, useExploration ? 0.8 : 1.35);
  }

  let target = rng() * totalWeight;

  for (let index = 0; index < candidateCount; index += 1) {
    target -= 1 / Math.pow(index + 1, useExploration ? 0.8 : 1.35);

    if (target <= 0) {
      return options[index];
    }
  }

  return options[candidateCount - 1];
}

function constructGraspBuild(
  initialBuild: BuildState,
  pools: GraspOptionPools,
  ringSlotLimit: number,
  rng: () => number,
  config: GraspSearchConfig,
): BuildState {
  const stageOrder: Array<keyof GraspOptionPools> = [
    "pan",
    "shovel",
    "necklace",
    "charm",
    "rings",
    "museum",
  ];

  let build = initialBuild;

  for (const stageName of stageOrder) {
    const choice = pickGraspOption(pools[stageName], rng, config);
    build = mergeStageChoice(build, choice, stageName, ringSlotLimit);
  }

  return build;
}

function addScoredBuild(
  target: Map<string, ScoredBuild>,
  build: BuildState,
  request: OptimizerRequest,
  label: string,
): void {
  if (!isCandidateBuildValid(build, request)) {
    return;
  }

  const identity = getFullBuildIdentity(build);
  const score = scoreSearchBuild(build, request);
  const existing = target.get(identity);

  if (!existing || score > existing.score) {
    target.set(identity, {
      build,
      score,
      label,
    });
  }
}

function buildGreedySeedBuilds(
  initialBuild: BuildState,
  pools: GraspOptionPools,
  ringSlotLimit: number,
): BuildState[] {
  const seeds: BuildState[] = [initialBuild];
  const stageOrder: Array<keyof GraspOptionPools> = [
    "pan",
    "shovel",
    "necklace",
    "charm",
    "rings",
    "museum",
  ];

  let greedy = initialBuild;

  for (const stageName of stageOrder) {
    if (pools[stageName][0]) {
      greedy = mergeStageChoice(greedy, pools[stageName][0], stageName, ringSlotLimit);
    }
  }

  seeds.push(greedy);

  for (const stageName of stageOrder) {
    if (!pools[stageName][0]) {
      continue;
    }

    seeds.push(mergeStageChoice(initialBuild, pools[stageName][0], stageName, ringSlotLimit));
  }

  return seeds;
}

function runGraspCompleteBuildSearch(
  initialBuild: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
  pools: GraspOptionPools,
  config: GraspSearchConfig,
  deadline: number,
): ScoredBuild[] {
  const rng = createSeededRng(getGraspSeed(initialBuild, request));
  const candidates = new Map<string, ScoredBuild>();

  for (const seed of buildGreedySeedBuilds(initialBuild, pools, ringSlotLimit)) {
    addScoredBuild(candidates, seed, request, "GRASP seed");
  }

  for (let iteration = 0; iteration < config.iterations; iteration += 1) {
    if (Date.now() > deadline - 1_500) {
      break;
    }

    const candidateBuild = constructGraspBuild(
      initialBuild,
      pools,
      ringSlotLimit,
      rng,
      config,
    );

    addScoredBuild(candidates, candidateBuild, request, "GRASP complete build");
  }

  return Array.from(candidates.values()).sort((a, b) => b.score - a.score);
}

export async function runFullBuildOptimizer(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
): Promise<OptimizerResult[]> {
  const mode = request.mode ?? "balanced";
  const config = GRASP_CONFIG[mode];
  const topResults = request.topResults ?? 25;
  const originalBuildHash = buildHash(build);
  const originalBuildIdentity = getFullBuildIdentity(build);
  const initialBuild: BuildState = {
    ...build,
    rings: cloneRings(build, ringSlotLimit),
  };

  const deadline =
    Date.now() + Math.max(5_000, getSearchTimeBudgetMs(request) - 8_000);

  const scoringRequest: OptimizerRequest = {
    ...request,
    objectiveRanges: undefined,
    searchDeadlineMs: deadline,
  };

  const stages = makeFullBuildStages(initialBuild, ringSlotLimit);
  const baselineScore = scoreBuild(evaluateBuild(initialBuild), scoringRequest);
  const requireBaselineImprovement = isFinalBuildValid(initialBuild, scoringRequest);

  const pools = buildGraspOptionPools(
    initialBuild,
    scoringRequest,
    ringSlotLimit,
    config,
  );

  const frontier = runGraspCompleteBuildSearch(
    initialBuild,
    scoringRequest,
    ringSlotLimit,
    pools,
    config,
    deadline,
  );

  return buildFinalResultsFromFrontier(
    frontier,
    scoringRequest,
    baselineScore,
    originalBuildHash,
    originalBuildIdentity,
    topResults,
    requireBaselineImprovement,
    stages,
  );
}
