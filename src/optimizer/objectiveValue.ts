import { EvaluatedBuild } from "./evaluatedTypes";

import type { OptimizerObjective } from "./types";

export function objectiveValue(
  evaluated: EvaluatedBuild,
  objective: OptimizerObjective,
): number {
  switch (objective) {
    case "efficiency":
      return evaluated.efficiency;

    case "modifierEfficiency":
      return evaluated.modifierEfficiency;

    case "modifierLuck":
      return evaluated.modifierLuck;

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

    case "jumpPower":
      return evaluated.stats.jumpPower;

    case "inventorySize":
      return evaluated.stats.inventorySize;

    case "statusTimerSpeed":
      return evaluated.stats.statusTimerSpeed;

    case "treasureMapChance":
      return evaluated.stats.treasureMapChance;

    default:
      return 0;
  }
}
