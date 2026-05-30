import { OptimizerSession } from "./types";

export function getReplayDepthTimeline(session: OptimizerSession): number[] {
  return session.history.map((snapshot) => snapshot.progress.currentDepth);
}
