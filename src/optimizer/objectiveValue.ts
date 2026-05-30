import { EvaluatedBuild } from "./evaluatedTypes";

import type { OptimizerObjective } from "./types";

export function objectiveValue(
  evaluated: EvaluatedBuild,
  objective: OptimizerObjective,
): number {
  switch (objective) {
    case "efficiency":
      return evaluated.efficiency;

    case "capacity":
      return evaluated.stats.capacity;

    case "luck":
      return evaluated.stats.luck;

    case "modifierBoost":
      return evaluated.stats.modifierBoost;

    case "sizeBoost":
      return evaluated.stats.sizeBoost;

    case "sellBoost":
      return evaluated.stats.sellBoost;

    case "digSpeed":
      return evaluated.stats.digSpeed;

    case "shakeSpeed":
      return evaluated.stats.shakeSpeed;

    case "digStrength":
      return evaluated.stats.digStrength;

    case "shakeStrength":
      return evaluated.stats.shakeStrength;
      
    case "walkSpeed":
      return evaluated.stats.walkSpeed;    

    default:
      return 0;
  }
}
