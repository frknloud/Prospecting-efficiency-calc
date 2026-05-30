import { ReplayValidationResult, SerializedOptimizerSession } from "./types";

const SUPPORTED_VERSION = 1;

export function validateSerializedSession(
  serialized: string,
): ReplayValidationResult {
  const errors: string[] = [];

  let payload: SerializedOptimizerSession;

  try {
    payload = JSON.parse(serialized) as SerializedOptimizerSession;
  } catch {
    return {
      valid: false,

      errors: ["Invalid JSON payload"],
    };
  }

  if (typeof payload.version !== "number") {
    errors.push("Missing replay version");
  }

  if (payload.version !== SUPPORTED_VERSION) {
    errors.push(`Unsupported replay version: ${payload.version}`);
  }

  if (!payload.session) {
    errors.push("Missing session payload");
  }

  return {
    valid: errors.length === 0,

    errors,
  };
}
