import { OptimizerSession, OptimizerSessionSnapshot } from "./types";

export function getReplaySnapshotsAtDepth(
  session: OptimizerSession,

  depth: number,
): OptimizerSessionSnapshot[] {
  return session.history.filter(
    (snapshot) => snapshot.progress.currentDepth === depth,
  );
}
