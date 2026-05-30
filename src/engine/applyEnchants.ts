import type { Enchant, PartialStats, Stats } from "./types";

function applyMultiplierStats(stats: Stats, multiplier?: PartialStats) {
  if (!multiplier) return;

  for (const key in multiplier) {
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

export function applyEnchant(stats: Stats, enchant?: Enchant | null) {
  if (!enchant) return;

  applyMultiplierStats(stats, enchant.multiplier);

  applyFlatStats(stats, enchant.flat);
}
