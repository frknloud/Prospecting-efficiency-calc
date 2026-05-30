import type { BuildState } from "../engine/types";

export function isBuildOptimizable(build: BuildState): boolean {
  if (!build.panId) {
    return false;
  }

  if (!build.shovelId) {
    return false;
  }

  let equippedAccessories = 0;

  if (build.necklaceId) {
    equippedAccessories++;
  }

  if (build.charmId) {
    equippedAccessories++;
  }

  equippedAccessories += build.rings.filter((ring) => ring?.ringId).length;

  if (equippedAccessories < 2) {
    return false;
  }

  return true;
}
