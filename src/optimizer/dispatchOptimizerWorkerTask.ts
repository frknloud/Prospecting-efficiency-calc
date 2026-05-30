import { createOptimizerWorker } from "./createOptimizerWorker";

import {
  OptimizerTask,
  OptimizerWorkerRequest,
  OptimizerWorkerResponse,
} from "./types";

import { BuildState } from "../engine/types";

import { sharedWorkerPool } from "./sharedWorkerPool";

import { createSerializableOptimizerRequest } from "./createSerializableOptimizerRequest";

import { createSerializableWorkerRequest } from "./createSerializableOptimizerRequest";

export async function dispatchOptimizerWorkerTask(
  task: OptimizerTask,

  build: BuildState,

  ringSlotLimit: number,

  onProgress?: (response: OptimizerWorkerResponse) => void,
): Promise<OptimizerWorkerResponse> {
  return new Promise((resolve, reject) => {
    const worker = sharedWorkerPool.acquire();

    task.worker = worker;

    const payload: OptimizerWorkerRequest = {
      taskId: task.id,

      build,

      request: createSerializableOptimizerRequest(task.request),

      ringSlotLimit,
    };

    worker.onmessage = (event: MessageEvent<OptimizerWorkerResponse>) => {
      if (event.data.type === "progress") {
        onProgress?.(event.data);

        return;
      }

      resolve(event.data);

      sharedWorkerPool.release(worker);
    };

    worker.onerror = (error) => {
      reject(error);

      sharedWorkerPool.release(worker);
    };

    structuredClone(payload);

    const safePayload = createSerializableWorkerRequest(payload);

    structuredClone(safePayload);

    worker.postMessage(safePayload);
  });
}
