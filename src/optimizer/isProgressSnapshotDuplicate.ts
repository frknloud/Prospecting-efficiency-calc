import { OptimizerProgress } from "./types";

export function isProgressSnapshotDuplicate(
  previous: OptimizerProgress,

  next: OptimizerProgress,
): boolean {
  return (
    previous.exploredBuilds === next.exploredBuilds &&
    previous.resultCount === next.resultCount &&
    previous.currentDepth === next.currentDepth
  );
}
