import type {
  OptimizerObjective,
} from "./types";

export const OPTIMIZER_OBJECTIVES: Array<{
  value: OptimizerObjective;
  label: string;
}> = [
  {
    value: "efficiency",
    label: "Efficiency",
  },
  {
    value: "luck",
    label: "Luck",
  },
  {
    value: "capacity",
    label: "Capacity",
  },
  {
    value: "digSpeed",
    label: "Dig Speed",
  },
  {
    value: "digStrength",
    label: "Dig Strength",
  },
  {
    value: "shakeSpeed",
    label: "Shake Speed",
  },
  {
    value: "shakeStrength",
    label: "Shake Strength",
  },
  {
    value: "modifierBoost",
    label: "Modifier Boost",
  },
  {
    value: "sizeBoost",
    label: "Size Boost",
  },
  {
    value: "sellBoost",
    label: "Sell Boost",
  },
  {
    value: "walkSpeed",
    label: "Walk Speed",
  },
];
