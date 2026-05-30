import { OptimizerRequest, OptimizerTask } from "./types";

export function createOptimizerTask(request: OptimizerRequest): OptimizerTask {
  return {
    id: crypto.randomUUID(),

    status: "pending",

    startedAt: Date.now(),

    strategy: request.strategy ?? "standard",

    request,
  };
}
