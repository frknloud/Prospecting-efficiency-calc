import { OptimizerSession, OptimizerSessionSnapshot } from "./types";

export function getSessionSnapshot(
  session: OptimizerSession,

  index: number,
): OptimizerSessionSnapshot | undefined {
  return session.history[index];
}
