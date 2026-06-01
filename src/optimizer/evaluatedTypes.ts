import { BuildState, Stats } from "../engine/types";

export interface EvaluatedBuild {
  build: BuildState;

  stats: Stats;

  efficiency: number;

  modifierLuck: number;

  modifierEfficiency: number;

  objectiveScore: number;

  cycleData: {
    cycleTime: number;
    shakeTime: number;
    digTime: number;
    digsRequired: number;
    totalDigTime: number;
    totalShakes: number;
    timePerDig: number;
    r: number;
  };

  valid: boolean;
}
