import { runOptimizer } from "./runOptimizer";

import { runFullBuildOptimizer } from "./runFullBuildOptimizer";

import { runBeamOptimizer } from "./runBeamOptimizer";

import { generateUpgradeCandidates } from "./generateUpgradeCandidates";

import { OptimizerRequest, OptimizerResult } from "./types";

import { BuildState } from "../engine/types";

export async function runOptimization(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
): Promise<OptimizerResult[]> {
  const strategy = request.strategy ?? "standard";

  if (strategy === "beam") {
    return runBeamOptimizer(build, request, ringSlotLimit);
  }

  if (strategy === "fullBuild") {
    return runFullBuildOptimizer(build, request, ringSlotLimit);
  }

  const candidates = generateUpgradeCandidates(
    build,
    ringSlotLimit,
    request.lockedSlots,
    request.objective,
    request.secondaryObjective,
    request.accessSettings,
  );

  return await runOptimizer(candidates, request);
}

export { runOptimizer, runBeamOptimizer, runFullBuildOptimizer };
