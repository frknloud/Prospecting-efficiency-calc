import { objectiveValue } from "./objectiveValue";

import { EvaluatedBuild } from "./evaluatedTypes";
import { OptimizerObjective } from "./types";

export function scoreBuild(
  evaluated: EvaluatedBuild,
  request: {
    objective: OptimizerObjective;
    secondaryObjective?: OptimizerObjective;
  },
) {
  const primary = objectiveValue(evaluated, request.objective);

  const secondary = request.secondaryObjective
    ? objectiveValue(evaluated, request.secondaryObjective)
    : 0;

  return primary * 1000000 + secondary;
}
