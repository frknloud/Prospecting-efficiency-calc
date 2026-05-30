import { OptimizerSession, SerializedOptimizerSession } from "./types";

const SESSION_FORMAT_VERSION = 1;

export function serializeOptimizerSession(session: OptimizerSession): string {
  const payload: SerializedOptimizerSession = {
    version: SESSION_FORMAT_VERSION,

    exportedAt: Date.now(),

    session,
  };

  return JSON.stringify(payload);
}
