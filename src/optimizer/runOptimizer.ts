import { evaluateCandidate } from "./evaluateCandidate";

import { OptimizerRequest, OptimizerResult } from "./types";

import { UpgradeCandidate } from "./candidateTypes";

import { buildHash } from "./buildHash";

import { MODE_CONFIG } from "./modeConfig";

import { candidateHeuristic } from "./candidateHeuristic";

export async function runOptimizer(
  candidates: UpgradeCandidate[],
  request: OptimizerRequest,
): Promise<OptimizerResult[]> {
  const results: OptimizerResult[] = [];

  const acceptedResultHashes = new Set<string>();

  const mode = request.mode ?? "balanced";

  const config = MODE_CONFIG[mode];

  const evaluatedCache = new Map<string, OptimizerResult | null>();

  //Suppress duplicate candidates

  const uniqueCandidates = Array.from(
    new Map(
      candidates.map((candidate) => [
        JSON.stringify(candidate.build),

        candidate,
      ]),
    ).values(),
  );

  const sortedCandidates = [...uniqueCandidates].sort(
    (a, b) => candidateHeuristic(b) - candidateHeuristic(a),
  );

  const mutationCandidates = sortedCandidates.filter((candidate) =>
    candidate.slot.includes("Mutation"),
  );

  const nonMutationCandidates = sortedCandidates.filter(
    (candidate) => !candidate.slot.includes("Mutation"),
  );

  const limitedMutationCandidates = mutationCandidates.slice(0, 50);

  const mergedCandidates = [
    ...nonMutationCandidates,
    ...limitedMutationCandidates,
  ];

  for (const candidate of mergedCandidates.slice(0, config.candidateLimit)) {
    const hash = buildHash(candidate.build);

    let result = evaluatedCache.get(hash);

    if (!evaluatedCache.has(hash)) {
      result = evaluateCandidate(candidate, request);

      evaluatedCache.set(hash, result);
    }

    if (!result) {
      continue;
    }

    const resultHash = buildHash(result.build);

    if (acceptedResultHashes.has(resultHash)) {
      continue;
    }

    acceptedResultHashes.add(resultHash);

    results.push(result);
  }

  results.sort((a, b) => b.score - a.score);

  return results.slice(0, request.topResults ?? config.maxResults);
}
