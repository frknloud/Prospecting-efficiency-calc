import { OptimizerSession, SerializedOptimizerSession } from "./types";

import { validateSerializedSession } from "./validateSerializedSession";

export function deserializeOptimizerSession(
  serialized: string,
): OptimizerSession {
  const validation = validateSerializedSession(serialized);

  if (!validation.valid) {
    throw new Error(validation.errors.join(", "));
  }

  const payload = JSON.parse(serialized) as SerializedOptimizerSession;

  return payload.session;
}
