import type { BuildState } from "./types";

export function stripTemporaryEffectsForOptimization(
  build: BuildState,
): BuildState {
  return {
    ...build,
    selectedConsumables: {
      boostRelics: [],
      potions: [],
    },
  };
}
