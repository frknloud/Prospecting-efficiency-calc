import { OptimizerSession } from "./types";

export function getReplayElapsedTimeline(session: OptimizerSession): number[] {
  return session.history.map((snapshot) => snapshot.elapsedMs);
}
