import { OptimizerSession } from "./types";

export function getReplayFrontierSizes(session: OptimizerSession): number[] {
  return session.history.map(
    (snapshot) => snapshot.progress.largestFrontierSize,
  );
}
