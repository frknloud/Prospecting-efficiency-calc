import { formatStatLabel } from "../utils/statLabels";

import type { OptimizerObjective } from "./types";

export const FARMING_OBJECTIVES: OptimizerObjective[] = [
  "efficiency",
  "modifierEfficiency",
  "luck",
  "capacity",
  "sizeBoost",
  "modifierBoost",
  "sellBoost",
  "digStrength",
  "digSpeed",
  "shakeStrength",
  "shakeSpeed",
];

export const MOVEMENT_OBJECTIVES: OptimizerObjective[] = [
  "walkSpeed",
  "jumpPower",
];

export const HIDDEN_OBJECTIVES: OptimizerObjective[] = [
  "modifierLuck",
  "inventorySize",
  "statusTimerSpeed",
  "treasureMapChance",
];

export function isEfficiencyObjective(objective: OptimizerObjective | undefined): boolean {
  return objective === "efficiency" || objective === "modifierEfficiency";
}

export function isMovementObjective(objective: OptimizerObjective | undefined): boolean {
  return Boolean(objective && MOVEMENT_OBJECTIVES.includes(objective));
}

export function isFarmingObjective(objective: OptimizerObjective | undefined): boolean {
  return Boolean(objective && FARMING_OBJECTIVES.includes(objective));
}

export function isUserFacingObjective(objective: OptimizerObjective): boolean {
  return !HIDDEN_OBJECTIVES.includes(objective);
}

export function canPairObjectives(
  primary: OptimizerObjective,
  secondary: OptimizerObjective | undefined,
): boolean {
  if (!secondary) {
    return true;
  }

  if (primary === secondary) {
    return false;
  }

  if (isMovementObjective(primary)) {
    return isMovementObjective(secondary);
  }

  if (isMovementObjective(secondary)) {
    return false;
  }

  return isFarmingObjective(primary) && isFarmingObjective(secondary);
}

export function getAllowedSecondaryObjectives(primary: OptimizerObjective) {
  const objectives = isMovementObjective(primary)
    ? MOVEMENT_OBJECTIVES
    : FARMING_OBJECTIVES;

  return objectives
    .filter((objective) => objective !== primary)
    .map((objective) => ({
      value: objective,
      label: formatStatLabel(objective),
    }));
}
