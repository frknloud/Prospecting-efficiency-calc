import type { EvaluatedBuild } from "./evaluatedTypes";

export function compareBuilds(
  baseline: EvaluatedBuild,
  candidate: EvaluatedBuild,
) {
  const statDiffs: Record<string, number> = {};

  for (const key of Object.keys(baseline.stats)) {
    const statKey = key as keyof typeof baseline.stats;

    statDiffs[key] =
      (candidate.stats[statKey] ?? 0) - (baseline.stats[statKey] ?? 0);
  }

  return {
    efficiencyDelta: candidate.efficiency - baseline.efficiency,

    cycleTimeDelta:
      candidate.cycleData.cycleTime - baseline.cycleData.cycleTime,

    statDiffs,
  };
}
