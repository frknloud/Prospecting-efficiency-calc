import { BuildState } from "../engine/types";

export function isBuildReadyForRecommendations(build: BuildState): boolean {
  const equippedRings = build.rings.filter((ring) => ring.ringId).length;

  return Boolean(
    build.panId &&
    build.shovelId &&
    build.necklaceId &&
    build.charmId &&
    equippedRings >= 4,
  );
}
