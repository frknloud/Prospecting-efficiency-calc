import { OptimizerSession, OptimizerSessionSnapshot } from "./types";

export function getSessionReplayRange(
  session: OptimizerSession,

  start: number,

  end: number,
): OptimizerSessionSnapshot[] {
  return session.history.slice(start, end);
}
