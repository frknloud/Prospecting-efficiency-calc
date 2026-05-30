import { OptimizerSession } from "./types";

export function getSessionDuration(session: OptimizerSession): number {
  return session.updatedAt - session.createdAt;
}
