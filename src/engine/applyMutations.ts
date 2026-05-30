import type { Mutation, PartialStats, Stats } from "./types";

function applyMultiplierStats(stats: Stats, multiplier?: PartialStats) {
  if (!multiplier) return;

  for (const key in multiplier) {
    if (key === "statusTimerSpeed") {
      continue;
    }

    const statKey = key as keyof Stats;

    stats[statKey] *= multiplier[statKey] ?? 1;
  }
}

function applyFlatStats(stats: Stats, flat?: PartialStats) {
  if (!flat) return;

  for (const key in flat) {
    const statKey = key as keyof Stats;

    stats[statKey] += flat[statKey] ?? 0;
  }
}

export function applyMutation(stats: Stats, mutation?: Mutation | null) {
  if (!mutation) return;

  if (mutation.multiplier) {
    const scalableStats = [
      "luck",
      "capacity",
      "shakeStrength",
      "shakeSpeed",
      "digStrength",
      "digSpeed",
      "sizeBoost",
      "modifierBoost",
      "sellBoost",
      "walkSpeed",
      "jumpPower",
      "inventorySize",
      "treasureMapChance",
    ] as const;

    for (const key of scalableStats) {
      const statKey = key as keyof Stats;

      stats[statKey] *= mutation.multiplier;
    }
  }

  applyMultiplierStats(stats, mutation.multipliers);

  applyFlatStats(stats, mutation.flat);
}
