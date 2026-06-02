import { objectiveValue } from "./objectiveValue";
import {
  canPairObjectives,
  isEfficiencyObjective,
  isMovementObjective,
} from "./objectiveRules";

import { EvaluatedBuild } from "./evaluatedTypes";
import { OptimizerObjective } from "./types";

const PRIMARY_SCORE_WEIGHT = 1_000_000_000;
const SECONDARY_SCORE_WEIGHT = 1_000_000;
const CYCLE_TIME_SCORE_WEIGHT = 1_000;
const RAW_TIE_BREAKER_WEIGHT = 0.001;

function cycleTimeScore(evaluated: EvaluatedBuild): number {
  const cycleTime = evaluated.cycleData?.cycleTime ?? Infinity;

  if (!Number.isFinite(cycleTime) || cycleTime <= 0) {
    return 0;
  }

  // Higher is better, but the value stays bounded between 0 and 1 so cycle
  // speed acts as a practical tie-breaker instead of overpowering objectives.
  return 1 / (1 + cycleTime);
}

function objectiveUtility(
  objective: OptimizerObjective,
  value: number,
  applySecondarySoftCap: boolean,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (objective === "sizeBoost" && applySecondarySoftCap) {
    if (value <= 1000) {
      return value;
    }

    if (value <= 1500) {
      return 1000 + (value - 1000) * 0.5;
    }

    return 1250 + (value - 1500) * 0.05;
  }

  if (objective === "modifierBoost" && applySecondarySoftCap) {
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
  options: { applySecondarySoftCap?: boolean } = {},
): number {
  const value = objectiveValue(evaluated, objective);
  const transformedValue = objectiveUtility(
    objective,
    value,
    Boolean(options.applySecondarySoftCap),
  );
  const range = request.objectiveRanges?.[objective];

  if (!range) {
    return Math.max(transformedValue, 0);
  }

  const transformedCurrent = objectiveUtility(
    objective,
    range.current,
    Boolean(options.applySecondarySoftCap),
  );
  const transformedBest = objectiveUtility(
    objective,
    range.best,
    Boolean(options.applySecondarySoftCap),
  );
  const denominator = transformedBest - transformedCurrent;

  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-9) {
    return transformedValue > transformedCurrent ? 1 : 0;
  }

  return Math.max(0, Math.min((transformedValue - transformedCurrent) / denominator, 1.5));
}

function rankedObjectiveScore(
  evaluated: EvaluatedBuild,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
    objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;
  },
  secondary?: OptimizerObjective,
): number {
  const primaryRaw = objectiveValue(evaluated, request.objective);
  const primary = normalizedObjectiveValue(evaluated, request.objective, request, {
    applySecondarySoftCap: false,
  });
  const secondaryRaw = secondary ? objectiveValue(evaluated, secondary) : 0;
  const secondaryScore = secondary
    ? normalizedObjectiveValue(evaluated, secondary, request, {
        applySecondarySoftCap: true,
      })
    : 0;
  const cycle = cycleTimeScore(evaluated);

  if (isMovementObjective(request.objective)) {
    return (
      primary * PRIMARY_SCORE_WEIGHT +
      secondaryScore * SECONDARY_SCORE_WEIGHT +
      primaryRaw * 1_000 +
      secondaryRaw +
      cycle * CYCLE_TIME_SCORE_WEIGHT
    );
  }

  if (isEfficiencyObjective(request.objective)) {
    // Efficiency and Modifier Efficiency already include cycle time, so the raw
    // objective remains dominant when selected as the primary target.
    return (
      primaryRaw * PRIMARY_SCORE_WEIGHT +
      secondaryScore * SECONDARY_SCORE_WEIGHT +
      cycle * CYCLE_TIME_SCORE_WEIGHT +
      secondaryRaw * RAW_TIE_BREAKER_WEIGHT
    );
  }

  return (
    primary * PRIMARY_SCORE_WEIGHT +
    secondaryScore * SECONDARY_SCORE_WEIGHT +
    cycle * CYCLE_TIME_SCORE_WEIGHT +
    primaryRaw * RAW_TIE_BREAKER_WEIGHT +
    secondaryRaw * RAW_TIE_BREAKER_WEIGHT * 0.1
  );
}

export function scoreBuild(
  evaluated: EvaluatedBuild,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
    objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;
  },
) {
  const secondary = request.secondaryObjective && canPairObjectives(request.objective, request.secondaryObjective)
    ? request.secondaryObjective
    : undefined;

  return rankedObjectiveScore(evaluated, request, secondary);
}
