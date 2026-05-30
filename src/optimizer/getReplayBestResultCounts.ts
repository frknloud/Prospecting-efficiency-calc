import { OptimizerSession } from "./types";

export function getReplayBestResultCounts(session: OptimizerSession): number[] {
  return session.history.map((snapshot) => snapshot.progress.resultCount);
}
