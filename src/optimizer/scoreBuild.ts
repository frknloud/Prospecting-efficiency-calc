import { objectiveValue } from "./objectiveValue";
import {
  canPairObjectives,
  isEfficiencyObjective,
  isMovementObjective,
} from "./objectiveRules";

import { EvaluatedBuild } from "./evaluatedTypes";
import { OptimizerObjective } from "./types";

const PRIMARY_WEIGHT = 0.65;
const SECONDARY_WEIGHT = 0.35;
const HYBRID_QUALIFIED_THRESHOLD = 0.55;

function objectiveUtility(
  objective: OptimizerObjective,
  value: number,
  isSoloObjective: boolean,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (objective === "sizeBoost" && !isSoloObjective) {
    if (value <= 1000) {
      return value;
    }

    if (value <= 1500) {
      return 1000 + (value - 1000) * 0.5;
    }

    return 1250 + (value - 1500) * 0.05;
  }

  if (objective === "modifierBoost" && !isSoloObjective) {
    if (value <= 1900) {
      return value;
    }

    return 1900 + (value - 1900) * 0.25;
  }

  return value;
}

function normalizedObjectiveValue(
  evaluated: EvaluatedBuild,
  objective: OptimizerObjective,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
    objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;
  },
): number {
  const value = objectiveValue(evaluated, objective);
  const isSoloObjective = !request.secondaryObjective;
  const transformedValue = objectiveUtility(objective, value, isSoloObjective);
  const range = request.objectiveRanges?.[objective];

  if (!range) {
    return Math.max(transformedValue, 0);
  }

  const transformedCurrent = objectiveUtility(objective, range.current, isSoloObjective);
  const transformedBest = objectiveUtility(objective, range.best, isSoloObjective);
  const denominator = transformedBest - transformedCurrent;

  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) {
    return transformedValue > transformedCurrent ? 1 : 0;
  }

  return Math.max(0, Math.min((transformedValue - transformedCurrent) / denominator, 1.5));
}

function hybridScore(
  evaluated: EvaluatedBuild,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
    objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;
  },
): number {
  const primary = normalizedObjectiveValue(evaluated, request.objective, request);

  if (!request.secondaryObjective || !canPairObjectives(request.objective, request.secondaryObjective)) {
    return primary;
  }

  const secondary = normalizedObjectiveValue(evaluated, request.secondaryObjective, request);

  return primary * PRIMARY_WEIGHT + secondary * SECONDARY_WEIGHT;
}

export function scoreBuild(
  evaluated: EvaluatedBuild,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
    objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;
  },
) {
  const primaryRaw = objectiveValue(evaluated, request.objective);
  const secondaryRaw = request.secondaryObjective
    ? objectiveValue(evaluated, request.secondaryObjective)
    : 0;

  const secondary = request.secondaryObjective && canPairObjectives(request.objective, request.secondaryObjective)
    ? request.secondaryObjective
    : undefined;

  if (!secondary) {
    return primaryRaw * 1_000_000 + evaluated.efficiency;
  }

  const hybrid = hybridScore(evaluated, {
    ...request,
    secondaryObjective: secondary,
  });

  if (isMovementObjective(request.objective)) {
    return hybrid * 1_000_000_000 + primaryRaw * 1_000 + secondaryRaw;
  }

  if (isEfficiencyObjective(request.objective) || isEfficiencyObjective(secondary)) {
    return hybrid * 1_000_000_000 + evaluated.efficiency;
  }

  const hybridQualified = Math.min(hybrid / HYBRID_QUALIFIED_THRESHOLD, 1);

  if (hybridQualified < 1) {
    return hybridQualified * 1_000_000_000 + hybrid * 1_000_000;
  }

  // Once a candidate is a reasonable hybrid match, efficiency ranks the best
  // practical version of that build type. The hybrid score remains a tie-breaker.
  return 1_000_000_000 + evaluated.efficiency * 1_000_000 + hybrid * 1_000 + primaryRaw + secondaryRaw * 0.001;
}
