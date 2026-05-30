import { useMemo } from "react";

import type { BuildState } from "../engine/types";

import { evaluateBuild } from "../engine/evaluateBuild";

export function useEvaluatedBuild(buildState: BuildState) {
  return useMemo(() => evaluateBuild(buildState), [buildState]);
}
