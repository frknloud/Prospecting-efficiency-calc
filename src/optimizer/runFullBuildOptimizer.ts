import { evaluateBuild } from "../engine/evaluateBuild";

import { scoreBuild } from "./scoreBuild";

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

const FULL_BUILD_CONFIG: Record<
  OptimizerMode,
  {
    beamWidth: number;
    perStageLimit: number;
  }
> = {
  fast: {
    beamWidth: 12,
    perStageLimit: 8,
  },

  balanced: {
    beamWidth: 20,
    perStageLimit: 10,
  },

  exhaustive: {
    beamWidth: 32,
    perStageLimit: 14,
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

function getMuseumOptionKey(build: BuildState, slotId: number): string {
  const slot = build.museumSlots.find((museumSlot) => museumSlot.slotId === slotId);

  return `${getNullableId(slot?.mineralId)}|${getNullableId(slot?.modifierId)}`;
}

function getStageSeedLimit(config: { beamWidth: number; perStageLimit: number }): number {
  return Math.max(config.perStageLimit * 3, config.beamWidth);
}

function buildAllowedStageKeys(
  stage: FullBuildStage,
  seedBuild: BuildState,
  request: OptimizerRequest,
  config: { beamWidth: number; perStageLimit: number },
): Set<string> {
  const seedLimit = hasMinStats(request)
    ? Math.max(getStageSeedLimit(config), config.perStageLimit * 8, 64)
    : getStageSeedLimit(config);

  const seedOptions = hasMinStats(request)
    ? rankConstraintStageOptions(stage.buildOptions(seedBuild, request), request, seedLimit)
    : rankStageOptions(stage.buildOptions(seedBuild, request), request, seedLimit);

  const keys = new Set(seedOptions.map((option) => stage.optionKey(option.build)));

  keys.add(stage.optionKey(seedBuild));

  return keys;
}


function hasMinStats(request: OptimizerRequest): boolean {
  return Boolean(request.minStats && Object.keys(request.minStats).length > 0);
}

function getMinConstraintStatus(
  evaluated: ReturnType<typeof evaluateBuild>,
  request: OptimizerRequest,
): { hasConstraints: boolean; passes: boolean; deficitRatio: number; progressRatio: number } {
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

    const value = Number(evaluated.stats[stat as keyof typeof evaluated.stats] ?? 0);
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

function scoreConstraintTargetBuild(build: BuildState, request: OptimizerRequest): number {
  const evaluated = evaluateBuild(build);
  const objectiveScore = scoreBuild(evaluated, request);
  const constraintStatus = getMinConstraintStatus(evaluated, request);

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

  return (1 - constraintStatus.deficitRatio) * 1_000_000_000_000 + objectiveScore;
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

function isCandidateBuildValid(build: BuildState, request: OptimizerRequest): boolean {
  return (
    isBuildLegal(build) &&
    !hasDuplicateMuseumMinerals(build) &&
    passesMaxStats(build, request)
  );
}

function isFinalBuildValid(build: BuildState, request: OptimizerRequest): boolean {
  return isCandidateBuildValid(build, request) && passesMinStats(build, request);
}

function scoreCandidateBuild(build: BuildState, request: OptimizerRequest): number {
  return scoreBuild(evaluateBuild(build), request);
}

function scoreSearchBuild(build: BuildState, request: OptimizerRequest): number {
  const evaluated = evaluateBuild(build);
  const objectiveScore = scoreBuild(evaluated, request);
  const constraintStatus = getMinConstraintStatus(evaluated, request);

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

  return (1 - constraintStatus.deficitRatio) * 1_000_000_000_000 + objectiveScore;
}

function makeFullBuildResult(build: BuildState, request: OptimizerRequest): OptimizerResult {
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
    new Map(options.map((option) => [getFullBuildIdentity(option.build), option])).values(),
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
  if (!hasMinStats(request)) {
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
  );

  if (primaryResults.length > 0 || !hasMinStats(request)) {
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
  );
}

function getAvailableMutationIds(request: OptimizerRequest): Array<string | null> {
  const accessSettings = request.accessSettings ?? DEFAULT_ACCESS_SETTINGS;

  if (!areMutationsAccessible(accessSettings)) {
    return [null];
  }

  return [
    null,
    ...mutations
      .filter(
        (mutation) => !mutation.limitedTime || accessSettings.includeLimitedTime,
      )
      .map((mutation) => mutation.id),
  ];
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

  const locked =
    slot === "necklace" ? request.lockedSlots?.necklace : request.lockedSlots?.charm;

  const options: StageOption[] = [
    {
      label: `Keep current ${slot}`,
      build,
    },
  ];

  if (locked) {
    return options;
  }

  const items = slot === "necklace" ? necklaces : charms;

  const mutationIds = getAvailableMutationIds(request);

  for (const item of items.filter((item) =>
    isItemAccessible(item as any, accessSettings),
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

  const options: StageOption[] = [
    {
      label: `Keep ring ${ringIndex + 1}`,
      build,
    },
  ];

  if (request.lockedSlots?.rings?.[ringIndex]) {
    return options;
  }

  const mutationIds = getAvailableMutationIds(request);

  const availableRings = rings.filter((ring) =>
    isItemAccessible(ring as any, accessSettings),
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

  for (let index = 0; index < ringSlotLimit; index++) {
    stages.push({
      name: `ring ${index + 1}`,
      buildOptions: (build, request) =>
        buildRingOptions(build, request, ringSlotLimit, index),
      optionKey: (build) => getRingOptionKey(build, index),
    });
  }

  for (const museumSlot of initialBuild.museumSlots ?? []) {
    stages.push({
      name: `museum ${museumSlot.slotId}`,
      buildOptions: (build, request) =>
        buildMuseumOptions(build, request, museumSlot),
      optionKey: (build) => getMuseumOptionKey(build, museumSlot.slotId),
    });
  }

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
): OptimizerResult[] {
  const acceptedBuildHashes = new Set<string>();

  const acceptedBuildIdentities = new Set<string>();

  const finalResults: OptimizerResult[] = [];

  for (const candidate of frontier.sort((a, b) => b.score - a.score)) {
    const finalObjectiveScore = scoreCandidateBuild(candidate.build, request);

    if (requireBaselineImprovement && finalObjectiveScore <= baselineScore) {
      continue;
    }

    const finalBuildHash = buildHash(candidate.build);

    const finalBuildIdentity = getFullBuildIdentity(candidate.build);

    if (
      finalBuildHash === originalBuildHash ||
      finalBuildIdentity === originalBuildIdentity ||
      acceptedBuildHashes.has(finalBuildHash) ||
      acceptedBuildIdentities.has(finalBuildIdentity)
    ) {
      continue;
    }

    if (!isFinalBuildValid(candidate.build, request)) {
      continue;
    }

    acceptedBuildHashes.add(finalBuildHash);

    acceptedBuildIdentities.add(finalBuildIdentity);

    finalResults.push(makeFullBuildResult(candidate.build, request));

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

  const baselineScore =
    request.baselineScore ?? scoreBuild(baselineEvaluated, request);

  const originalBuildHash = buildHash(build);

  const originalBuildIdentity = getFullBuildIdentity(build);

  const initialBuild: BuildState = {
    ...build,
    rings: cloneRings(build, ringSlotLimit),
  };

  const requireBaselineImprovement = isFinalBuildValid(initialBuild, request);

  const stages = makeFullBuildStages(initialBuild, ringSlotLimit);

  const deadline = Date.now() + FULL_BUILD_TIME_BUDGET_MS;

  let frontier: ScoredBuild[] = [
    {
      build: initialBuild,
      score: scoreSearchBuild(initialBuild, request),
      label: "Current build",
    },
  ];

  for (const stage of stages) {
    if (Date.now() > deadline) {
      return buildResultsOrConstraintRescue(
        frontier,
        request,
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

    const allowedStageKeys = buildAllowedStageKeys(stage, initialBuild, request, config);

    for (const frontierBuild of frontier) {
      if (Date.now() > deadline) {
        const partialFrontier = Array.from(stageMap.values());

        return buildResultsOrConstraintRescue(
          partialFrontier.length > 0 ? partialFrontier : frontier,
          request,
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
        .buildOptions(frontierBuild.build, request)
        .filter((option) => {
          const optionKey = stage.optionKey(option.build);

          return optionKey === currentStageKey || allowedStageKeys.has(optionKey);
        });

      const stageLimit = hasMinStats(request)
        ? Math.max(config.perStageLimit * 3, 24)
        : config.perStageLimit;

      const rankedOptions = hasMinStats(request)
        ? rankConstraintStageOptions(stageOptions, request, stageLimit)
        : rankStageOptions(stageOptions, request, stageLimit);

      for (const option of rankedOptions) {
        const identity = getFullBuildIdentity(option.build);

        const score = scoreSearchBuild(option.build, request);

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

    const frontierLimit = hasMinStats(request)
      ? Math.max(config.beamWidth * 3, 72)
      : config.beamWidth;

    frontier = Array.from(stageMap.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, frontierLimit);

    if (frontier.length === 0) {
      return buildResultsOrConstraintRescue(
        frontier,
        request,
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
    request,
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
