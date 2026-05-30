import type { BuildState } from "./types";

export function normalizeBuildState(
  build: BuildState,
  ringSlotLimit: number,
): BuildState {
  return {
    ...build,

    rings: Array.from(
      { length: ringSlotLimit },
      (_, index) => ({
        ringId: build.rings[index]?.ringId ?? null,
        mutationId: build.rings[index]?.mutationId ?? null,
      }),
    ),
  };
}
