import { UpgradeCandidate } from "./candidateTypes";

function getSlotWeight(slot: string): number {
  if (slot.startsWith("ringMutation")) {
    return 90;
  }

  if (slot === "necklaceMutation") {
    return 80;
  }

  if (slot === "charmMutation") {
    return 70;
  }

  if (slot.startsWith("ring")) {
    return 100;
  }

  switch (slot) {
    case "necklace":
      return 75;

    case "charm":
      return 50;

    case "shovel":
      return 25;

    case "pan":
      return 10;

    default:
      return 0;
  }
}

const mutationWeights: Record<string, number> = {
  prismatic: 100,
  festive: 70,
  diamond: 55,
  granite: 50,
  overclocked: 50,
  gold: 35,
  silver: 20,
};

export function candidateHeuristic(candidate: UpgradeCandidate): number {
  let score = getSlotWeight(candidate.slot);

  const newItemId = candidate.newItemId ?? "";

  score += mutationWeights[newItemId] ?? 0;

  return score;
}
