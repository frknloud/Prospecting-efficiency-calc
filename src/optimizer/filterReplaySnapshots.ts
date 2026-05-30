import {
  OptimizerSession,
  OptimizerSessionSnapshot,
  ReplaySnapshotPredicate,
} from "./types";

export function filterReplaySnapshots(
  session: OptimizerSession,

  predicate: ReplaySnapshotPredicate,
): OptimizerSessionSnapshot[] {
  return session.history.filter(predicate);
}
