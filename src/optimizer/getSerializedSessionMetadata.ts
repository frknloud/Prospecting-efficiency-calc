import { SerializedOptimizerSession } from "./types";

export function getSerializedSessionMetadata(serialized: string): {
  version: number;

  exportedAt: number;
} {
  const payload = JSON.parse(serialized) as SerializedOptimizerSession;

  return {
    version: payload.version,

    exportedAt: payload.exportedAt,
  };
}
