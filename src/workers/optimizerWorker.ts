import { runOptimization } from "../optimizer/optimizer";

import type { OptimizerWorkerRequest, OptimizerWorkerResponse } from "./types";

self.onmessage = async (event: MessageEvent<OptimizerWorkerRequest>) => {
  const { requestId, build, request, ringSlotLimit } = event.data;

  const results = await runOptimization(
    build,
    request,
    ringSlotLimit,
  );

  const response: OptimizerWorkerResponse = {
    requestId,

    results,
  };

  self.postMessage(response);
};
