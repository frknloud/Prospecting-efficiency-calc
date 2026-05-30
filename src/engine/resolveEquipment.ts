import { ringMap, charmMap, necklaceMap, panMap, shovelMap } from "./itemMaps";

import type { BuildState } from "./types";

export function resolveEquipment(build: BuildState) {
  return {
    pan: build.panId ? panMap.get(build.panId) : null,

    shovel: build.shovelId ? shovelMap.get(build.shovelId) : null,

    necklace: build.necklaceId ? necklaceMap.get(build.necklaceId) : null,

    charm: build.charmId ? charmMap.get(build.charmId) : null,

    rings: build.rings
      .filter((selection) => selection.ringId)
      .map((selection) => ringMap.get(selection.ringId!))
      .filter(Boolean),
  };
}
