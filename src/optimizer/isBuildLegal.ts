import type { BuildState } from "../engine/types";

import rings from "../data/rings.json";

export function isBuildLegal(build: BuildState): boolean {
  if (build.rings.length > 8) {
    return false;
  }

  const equippedRingIds = build.rings
    .map((ring) => ring?.ringId)
    .filter(Boolean);

  const uniqueRestricted = rings.filter((ring) => ring.unique === true);

  for (const restrictedRing of uniqueRestricted) {
    const occurrences = equippedRingIds.filter(
      (id) => id === restrictedRing.id,
    ).length;

    if (occurrences > 1) {
      return false;
    }
  }

  return true;
}
