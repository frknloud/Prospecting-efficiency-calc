import type { BuildState } from "../engine/types";

import type { OptimizerRequest, OptimizerResult } from "../optimizer/types";

export interface OptimizerWorkerRequest {
  requestId: number;

  build: BuildState;

  ringSlotLimit: number;

  request: OptimizerRequest;
}

export interface OptimizerWorkerResponse {
  requestId: number;

  results: OptimizerResult[];
}
