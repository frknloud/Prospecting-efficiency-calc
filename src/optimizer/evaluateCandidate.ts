import { evaluateBuild } from "../engine/evaluateBuild";

import { scoreBuild } from "./scoreBuild";

import { isBuildLegal } from "./isBuildLegal";

import { OptimizerRequest, OptimizerResult } from "./types";

import { UpgradeCandidate } from "./candidateTypes";

export function evaluateCandidate(
  candidate: UpgradeCandidate,
  request: OptimizerRequest,
): OptimizerResult | null {
  if (!isBuildLegal(candidate.build)) {
    return null;
  }

  const evaluated = evaluateBuild(candidate.build);

  if (request.minStats) {
    for (const [stat, min] of Object.entries(request.minStats)) {
      const value = evaluated.stats[stat as keyof typeof evaluated.stats];

      if (value !== undefined && value < (min ?? 0)) {
        return null;
      }
    }
  }

  if (request.maxStats) {
    for (const [stat, max] of Object.entries(request.maxStats)) {
      const value = evaluated.stats[stat as keyof typeof evaluated.stats];

      if (value !== undefined && value > (max ?? 0)) {
        return null;
      }
    }
  }

  const score = scoreBuild(evaluated, request);

  if (request.baselineScore !== undefined && score <= request.baselineScore) {
    return null;
  }

  if (
    request.baselineScore === undefined &&
    request.objective === "efficiency" &&
    request.baselineEfficiency !== undefined &&
    evaluated.efficiency <= request.baselineEfficiency
  ) {
    return null;
  }

  return {
    candidate,

    build: candidate.build,

    evaluated,

    score,
  };
}
