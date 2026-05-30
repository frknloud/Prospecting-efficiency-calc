import {
  OptimizerRequest,
  RuntimeOptimizerRequest,
  OptimizerWorkerRequest,
} from "./types";

export function createSerializableWorkerRequest(
  request: OptimizerWorkerRequest,
): OptimizerWorkerRequest {
  return JSON.parse(JSON.stringify(request)) as OptimizerWorkerRequest;
}

export function createSerializableOptimizerRequest(
  request: RuntimeOptimizerRequest,
): OptimizerRequest {
  return JSON.parse(JSON.stringify(request)) as OptimizerRequest;
}
