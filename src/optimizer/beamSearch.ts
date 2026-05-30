import { generateUpgradeCandidates } from "./generateUpgradeCandidates";

import { runOptimizer } from "./runOptimizer";

import { OptimizerRequest, OptimizerResult, OptimizerTask } from "./types";

import { BuildState } from "../engine/types";

import { buildHash } from "./buildHash";

import { scoreFrontierBuild } from "./scoreFrontierBuild";

import { BEAM_MODE_CONFIG } from "./beamModeConfig";

import { yieldToEventLoop } from "./yieldToEventLoop";

export async function beamSearch(
  initialBuild: BuildState,
  request: OptimizerRequest,
  ringSlotLimit: number,
  task?: OptimizerTask,
): Promise<OptimizerResult[]> {
  const visited = new Set<string>();

  let frontier: BuildState[] = [initialBuild];

  const finalResults: OptimizerResult[] = [];

  let exploredBuilds = 0;

  let duplicateBuildSkips = 0;

  let duplicateResultSkips = 0;

  let totalGeneratedFrontier = 0;

  let largestFrontierSize = 0;

  const acceptedResultHashes = new Set<string>();

  const beamMode = request.beamMode ?? "balanced";

  const modeConfig = BEAM_MODE_CONFIG[beamMode];

  const beamWidth = request.beamWidth ?? modeConfig.beamWidth;

  const beamDepth = request.beamDepth ?? modeConfig.beamDepth;

  function getDepthBeamWidth(depth: number): number {
    const reduction = Math.floor(depth / 2);

    return Math.max(2, beamWidth - reduction);
  }

  function buildProgress(currentDepth: number) {
    return {
      exploredBuilds,

      duplicateBuildSkips,

      duplicateResultSkips,

      totalGeneratedFrontier,

      largestFrontierSize,

      currentDepth,

      beamWidth,

      beamDepth,

      resultCount: finalResults.length,
    };
  }

  for (let depth = 0; depth < beamDepth; depth++) {
    if (task?.cancelRequested) {
      break;
    }

    const nextFrontier: BuildState[] = [];

    for (const build of frontier) {
      const buildKey = buildHash(build);

      if (exploredBuilds % 25 === 0) {
        await yieldToEventLoop();

        task?.onProgress?.(
          [...finalResults],

          buildProgress(depth),
        );
      }

      if (visited.has(buildKey)) {
        duplicateBuildSkips++;

        continue;
      }

      visited.add(buildKey);

      exploredBuilds++;

      const candidates = generateUpgradeCandidates(
        build,
        ringSlotLimit,
        request.lockedSlots,
        request.objective,
        request.secondaryObjective,
        request.accessSettings,
      );

      const results = await runOptimizer(candidates, request);

      for (const result of results) {
        const resultHash = buildHash(result.build);

        if (acceptedResultHashes.has(resultHash)) {
          duplicateResultSkips++;

          continue;
        }

        acceptedResultHashes.add(resultHash);

        finalResults.push(result);

        task?.onProgress?.(
          [...finalResults],

          buildProgress(depth),
        );
      }

      const activeBeamWidth = getDepthBeamWidth(depth);

      const nextBuilds = [...results]
        .sort((a, b) => scoreFrontierBuild(b) - scoreFrontierBuild(a))
        .slice(0, activeBeamWidth)
        .map((result) => result.build);

      nextFrontier.push(...nextBuilds);

      totalGeneratedFrontier += nextBuilds.length;

      largestFrontierSize = Math.max(largestFrontierSize, nextFrontier.length);
    }

    frontier = nextFrontier;
  }

  finalResults.sort((a, b) => b.score - a.score);

  return finalResults.slice(0, request.topResults ?? 25);
}
