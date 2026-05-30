import { OptimizerSession } from "./types";

export function createOptimizerSession(): OptimizerSession {
  const now = Date.now();

  return {
    id: crypto.randomUUID(),

    createdAt: now,

    updatedAt: now,

    tasks: [],

    history: [],

    stats: {
      totalSnapshots: 0,

      totalExploredBuilds: 0,

      totalDuplicateBuildSkips: 0,

      totalDuplicateResultSkips: 0,

      maxFrontierSize: 0,

      deepestDepthReached: 0,

      bestResultCount: 0,
    },
  };
}
