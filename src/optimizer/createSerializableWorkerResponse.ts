import { OptimizerWorkerResponse } from "./types";

export function createSerializableWorkerResponse(
  response: OptimizerWorkerResponse,
): OptimizerWorkerResponse {
  return JSON.parse(JSON.stringify(response)) as OptimizerWorkerResponse;
}
