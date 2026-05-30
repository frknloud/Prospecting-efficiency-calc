import { beamSearch } from "./beamSearch";

import { OptimizerRequest, OptimizerResult } from "./types";

import { BuildState } from "../engine/types";

export async function runBeamOptimizer(
  build: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
): Promise<OptimizerResult[]> {
  const initialResults = beamSearch(build, request, ringSlotLimit);

  return await initialResults;
}
