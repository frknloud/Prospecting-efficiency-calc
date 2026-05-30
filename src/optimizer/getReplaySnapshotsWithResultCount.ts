import { OptimizerSession, OptimizerSessionSnapshot } from "./types";

export function getReplaySnapshotsWithResultCount(
  session: OptimizerSession,

  minimumResults: number,
): OptimizerSessionSnapshot[] {
  return session.history.filter(
    (snapshot) => snapshot.progress.resultCount >= minimumResults,
  );
}
