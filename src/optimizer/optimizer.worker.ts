// Legacy experimental worker infrastructure.
// Current production worker:
// src/workers/optimizerWorker.ts
//
// Keep until future worker consolidation phase.

/// <reference lib="webworker" />

import { runOptimization } from "./optimizer";

import {
  OptimizerWorkerRequest,
  OptimizerWorkerResponse,
  RuntimeOptimizerRequest,
  OptimizerWorkerControlMessage,
} from "./types";

import { createSerializableWorkerResponse } from "./createSerializableWorkerResponse";

const cancelledTasks = new Set<string>();

self.addEventListener(
  "message",

  (event) => {
    const data = event.data as OptimizerWorkerControlMessage;

    if (data.type === "cancel") {
      cancelledTasks.add(data.taskId);
    }
  },
);

self.onmessage = async (event: MessageEvent<OptimizerWorkerRequest>) => {
  const data = event.data;

  try {
    const request = data.request;

    const results = await runOptimization(
      data.build,
      request,
      data.ringSlotLimit,
    );
    const response: OptimizerWorkerResponse = {
      type: "complete",

      taskId: data.taskId,

      results: [],
    };

    structuredClone(response);

    self.postMessage(createSerializableWorkerResponse(response));
  } catch (error) {
    const response: OptimizerWorkerResponse = {
      type: "error",

      taskId: data.taskId,

      results: [],

      error: error instanceof Error ? error.message : String(error),
    };

    structuredClone(response);

    self.postMessage(createSerializableWorkerResponse(response));
  }
};
