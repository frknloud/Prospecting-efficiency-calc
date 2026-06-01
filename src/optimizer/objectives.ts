import { formatStatLabel } from "../utils/statLabels";

import { FARMING_OBJECTIVES, MOVEMENT_OBJECTIVES } from "./objectiveRules";

import type { OptimizerObjective } from "./types";

export const OPTIMIZER_OBJECTIVES: Array<{
  value: OptimizerObjective;
  label: string;
}> = [...FARMING_OBJECTIVES, ...MOVEMENT_OBJECTIVES].map((objective) => ({
  value: objective,
  label: formatStatLabel(objective),
}));
