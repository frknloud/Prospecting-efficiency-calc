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
  isOptimizerMutationAllowed,
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

function buildAllowedStageKeys(
  stage: FullBuildStage,
  seedBuild: BuildState,
  request: OptimizerRequest,
  config: { beamWidth: number; perStageLimit: number },
): Set<string> {
  const hasHardSearchConstraints =
    hasMinStats(request) || request.forceOneTapBuilds;
  const useOverhaulSearch = shouldUseOverhaulSearch(request);

  const seedLimit = hasHardSearchConstraints
    ? Math.max(getStageSeedLimit(config), config.perStageLimit * 8, 64)
    : useOverhaulSearch
      ? Math.max(
          getStageSeedLimit(config),
          config.perStageLimit * 5,
          config.beamWidth * 2,
          40,
        )
      : getStageSeedLimit(config);

  const seedOptions = hasHardSearchConstraints
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

  if (request.forceOneTapBuilds && evaluated.cycleData.digsRequired !== 1) {
    return oneTapScore * 1_000_000_000_000 + objectiveScore;
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

  if (!Number.isFinite(digsRequired) || digsRequired <= 1) {
    return 0;
  }

  return 1 / digsRequired;
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

  if (request.forceOneTapBuilds && evaluated.cycleData.digsRequired !== 1) {
    return oneTapScore * 1_000_000_000_000 + objectiveScore;
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

  return polished;
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
  const rescueBeamWidth = 72;
  const rescuePerStageLimit = 36;

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

  const enchantIds: Array<string | null> = [
    null,
    ...enchants.map((enchant) => enchant.id),
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

  for (const shovel of shovels.filter((item) =>
    isItemAccessible(item as any, accessSettings),
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
    const next = new Map<
      string,
      { rings: RingSelection[]; build: BuildState; score: number }
    >();

    for (const frontierEntry of frontier) {
      for (const ringOption of perSlotOptions[index]) {
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
    const next = new Map<
      string,
      { museumSlots: MuseumSlotSelection[]; build: BuildState; score: number }
    >();

    for (const frontierEntry of frontier) {
      for (const slotOption of perSlotOptions[index]) {
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

export async function runFullBuildOptimizer(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
): Promise<OptimizerResult[]> {
  const mode = request.mode ?? "balanced";

  const config = FULL_BUILD_CONFIG[mode];

  const topResults = request.topResults ?? 25;

  const baselineEvaluated = evaluateBuild(build);

  const originalBuildHash = buildHash(build);

  const originalBuildIdentity = getFullBuildIdentity(build);

  const initialBuild: BuildState = {
    ...build,
    rings: cloneRings(build, ringSlotLimit),
  };

  const stages = makeFullBuildStages(initialBuild, ringSlotLimit);

  const scoringRequest: OptimizerRequest = {
    ...request,
    objectiveRanges: computeObjectiveRanges(initialBuild, request, stages),
  };

  // Full-build hybrid scoring depends on objectiveRanges derived inside this
  // optimizer pass. A baseline score calculated earlier without those ranges is
  // on a different scale and can accidentally filter out every candidate. Always
  // score the baseline with the same request object used for candidate scoring.
  const baselineScore = scoreBuild(baselineEvaluated, scoringRequest);

  const requireBaselineImprovement = isFinalBuildValid(
    initialBuild,
    scoringRequest,
  );

  // Keep an internal margin so the worker can return partial/unique results
  // instead of being terminated by the outer timeout handler.
  const deadline =
    Date.now() + Math.max(5_000, getSearchTimeBudgetMs(scoringRequest) - 8_000);

  let frontier: ScoredBuild[] = [
    {
      build: initialBuild,
      score: scoreSearchBuild(initialBuild, scoringRequest),
      label: "Current build",
    },
  ];

  for (const stage of stages) {
    if (Date.now() > deadline) {
      return buildResultsOrConstraintRescue(
        frontier,
        scoringRequest,
        baselineScore,
        originalBuildHash,
        originalBuildIdentity,
        topResults,
        requireBaselineImprovement,
        initialBuild,
        ringSlotLimit,
        stages,
      );
    }

    const stageMap = new Map<string, ScoredBuild>();

    const allowedStageKeys = buildAllowedStageKeys(
      stage,
      initialBuild,
      scoringRequest,
      config,
    );

    for (const frontierBuild of frontier) {
      if (Date.now() > deadline) {
        const partialFrontier = Array.from(stageMap.values());

        return buildResultsOrConstraintRescue(
          partialFrontier.length > 0 ? partialFrontier : frontier,
          scoringRequest,
          baselineScore,
          originalBuildHash,
          originalBuildIdentity,
          topResults,
          requireBaselineImprovement,
          initialBuild,
          ringSlotLimit,
          stages,
        );
      }

      const currentStageKey = stage.optionKey(frontierBuild.build);

      const stageOptions = stage
        .buildOptions(frontierBuild.build, scoringRequest)
        .filter((option) => {
          const optionKey = stage.optionKey(option.build);

          return (
            optionKey === currentStageKey || allowedStageKeys.has(optionKey)
          );
        });

      const useOverhaulSearch = shouldUseOverhaulSearch(scoringRequest);

      const stageLimit = hasMinStats(scoringRequest)
        ? Math.max(config.perStageLimit * 3, 24)
        : useOverhaulSearch
          ? Math.max(config.perStageLimit * 2, 18)
          : config.perStageLimit;

      const rankedOptions = hasMinStats(scoringRequest)
        ? rankConstraintStageOptions(stageOptions, scoringRequest, stageLimit)
        : rankStageOptions(stageOptions, scoringRequest, stageLimit);

      for (const option of rankedOptions) {
        const identity = getFullBuildIdentity(option.build);

        const score = scoreSearchBuild(option.build, scoringRequest);

        const existing = stageMap.get(identity);

        if (!existing || score > existing.score) {
          stageMap.set(identity, {
            build: option.build,
            score,
            label: `${stage.name}: ${option.label}`,
          });
        }
      }
    }

    const frontierLimit = hasMinStats(scoringRequest)
      ? Math.max(config.beamWidth * 3, 72)
      : shouldUseOverhaulSearch(scoringRequest)
        ? Math.max(config.beamWidth * 2, 40)
        : config.beamWidth;

    frontier = Array.from(stageMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, frontierLimit);

    if (frontier.length === 0) {
      return buildResultsOrConstraintRescue(
        frontier,
        scoringRequest,
        baselineScore,
        originalBuildHash,
        originalBuildIdentity,
        topResults,
        requireBaselineImprovement,
        initialBuild,
        ringSlotLimit,
        stages,
      );
    }
  }

  return buildResultsOrConstraintRescue(
    frontier,
    scoringRequest,
    baselineScore,
    originalBuildHash,
    originalBuildIdentity,
    topResults,
    requireBaselineImprovement,
    initialBuild,
    ringSlotLimit,
    stages,
  );
}
