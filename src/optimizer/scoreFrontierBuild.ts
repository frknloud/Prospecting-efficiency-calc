import { OptimizerResult } from "./types";

export function scoreFrontierBuild(result: OptimizerResult): number {
  return result.score;
}
