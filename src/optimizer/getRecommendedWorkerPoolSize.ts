import {
  MIN_WORKER_POOL_SIZE,
  MAX_WORKER_POOL_SIZE,
} from "./workerScalingConfig";

export function getRecommendedWorkerPoolSize(): number {
  const cores = navigator.hardwareConcurrency ?? 4;

  return Math.max(
    MIN_WORKER_POOL_SIZE,

    Math.min(
      MAX_WORKER_POOL_SIZE,

      Math.floor(cores / 2),
    ),
  );
}
