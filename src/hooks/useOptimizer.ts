// Active optimizer runtime entrypoint.
// This hook currently owns the live worker orchestration flow.

import { useState, useEffect, useRef } from "react";

import type { BuildState } from "../engine/types";

import type { OptimizerRequest, OptimizerResult } from "../optimizer/types";

import OptimizerWorker from "../workers/optimizerWorker?worker";

import type { OptimizerWorkerResponse } from "../workers/types";

import { OPTIMIZER_REQUEST_TIMEOUT_MS } from "../optimizer/optimizerConfig";

function getResultBuildSignature(result: OptimizerResult): string {
  return JSON.stringify({
    panId: result.build.panId ?? null,
    panEnchantId: result.build.panEnchantId ?? null,
    shovelId: result.build.shovelId ?? null,
    necklaceId: result.build.necklaceId ?? null,
    necklaceMutationId: result.build.necklaceMutationId ?? null,
    charmId: result.build.charmId ?? null,
    charmMutationId: result.build.charmMutationId ?? null,
    rings: result.build.rings.map((ring) => ({
      ringId: ring.ringId ?? null,
      mutationId: ring.mutationId ?? null,
    })),
    museumSlots: result.build.museumSlots
      .slice()
      .sort((a, b) => a.slotId - b.slotId)
      .map((slot) => ({
        slotId: slot.slotId,
        mineralId: slot.mineralId ?? null,
        modifierId: slot.modifierId ?? null,
      })),
  });
}

function dedupeOptimizerResults(results: OptimizerResult[]): OptimizerResult[] {
  const seen = new Set<string>();

  const uniqueResults: OptimizerResult[] = [];

  for (const result of results) {
    const signature = getResultBuildSignature(result);

    if (seen.has(signature)) {
      continue;
    }

    seen.add(signature);

    uniqueResults.push(result);
  }

  return uniqueResults;
}

export function useOptimizer() {
  const [loading, setLoading] = useState(false);

  const [results, setResults] = useState<OptimizerResult[]>([]);

  const optimizerCacheRef = useRef(new Map<string, OptimizerResult[]>());

  const latestRequestRef = useRef(0);

  const workerRef = useRef<Worker | null>(null);

  const pendingRequestsRef = useRef(
    new Map<
      number,
      {
        timeout: number;

        resolve: (results: OptimizerResult[]) => void;

        reject: (error: unknown) => void;
      }
    >(),
  );

  function createWorker() {
    const worker = new OptimizerWorker();

    worker.onmessage = (event: MessageEvent<OptimizerWorkerResponse>) => {
      const { requestId, results } = event.data;

      const pending = pendingRequestsRef.current.get(requestId);

      if (!pending) {
        return;
      }

      clearTimeout(pending.timeout);

      pending.resolve(results);

      pendingRequestsRef.current.delete(requestId);
    };

    worker.onerror = (error) => {
      for (const pending of pendingRequestsRef.current.values()) {
        clearTimeout(pending.timeout);

        pending.reject(error);
      }

      pendingRequestsRef.current.clear();

      worker.terminate();

      workerRef.current = null;
    };

    workerRef.current = worker;
  }

  function cancelPendingRequests() {
    for (const pending of pendingRequestsRef.current.values()) {
      clearTimeout(pending.timeout);

      pending.resolve([]);
    }

    pendingRequestsRef.current.clear();

    workerRef.current?.terminate();

    workerRef.current = null;
  }

  useEffect(() => {
    createWorker();

    return () => {
      cancelPendingRequests();
    };
  }, []);

  function clearResults() {
    setResults([]);
  }

  async function runOptimizerHandler(
    buildHash: string,

    build: BuildState,

    ringSlotLimit: number,

    request: OptimizerRequest,
    resultFilter?: (result: OptimizerResult) => boolean,
    timeoutMs: number = OPTIMIZER_REQUEST_TIMEOUT_MS,
  ): Promise<OptimizerResult[]> {
    const requestId = ++latestRequestRef.current;

    setResults([]);
    setLoading(true);

    const cached =
      optimizerCacheRef.current.get(
        buildHash
      );

    if (cached) {

      const filteredCached = dedupeOptimizerResults(
        resultFilter
          ? cached.filter(
              resultFilter
            )
          : cached
      );

      if (
        requestId ===
        latestRequestRef.current
      ) {
        window.setTimeout(() => {
          if (requestId === latestRequestRef.current) {
            setResults(
              filteredCached
            );
            setLoading(false);
          }
        }, 0);
      }

      return filteredCached;
    }

    cancelPendingRequests();

    try {
      const result = await new Promise<OptimizerResult[]>((resolve, reject) => {
        if (!workerRef.current) {
          createWorker();
        }

        const worker = workerRef.current;

        if (!worker) {
          reject(new Error("Worker unavailable"));

          return;
        }

        const timeout = window.setTimeout(() => {
          for (const pending of pendingRequestsRef.current.values()) {
            clearTimeout(pending.timeout);

            pending.reject(new Error("Optimizer worker terminated"));
          }

          pendingRequestsRef.current.clear();

          worker.terminate();

          workerRef.current = null;

          reject(new Error("Optimizer request timed out"));
        }, timeoutMs);

        pendingRequestsRef.current.set(
          requestId,

          {
            timeout,
            resolve,
            reject,
          },
        );

        worker.postMessage({
          requestId,

          build,

          ringSlotLimit,

          request,
        });
      });

      if (requestId !== latestRequestRef.current) {
        return result;
      }

      const filteredResult = dedupeOptimizerResults(
        resultFilter
          ? result.filter(
              resultFilter
            )
          : result
      );

      optimizerCacheRef.current.set(
        buildHash,
        filteredResult
      );

      setResults(
        filteredResult
      );

      return filteredResult;
    } finally {
      if (requestId === latestRequestRef.current) {
        setLoading(false);
      }
    }
  }

  return {
    loading,
    results,
    clearResults,
    runOptimizer: runOptimizerHandler,
  };
}
