import { OptimizerSession, OptimizerSessionSnapshot } from "./types";

export function getLatestSessionSnapshot(
  session: OptimizerSession,
): OptimizerSessionSnapshot | undefined {
  return session.history[session.history.length - 1];
}
