import { BuildState } from "./types";

import type { RingSelection } from "./types";

import pans from "../data/pans.json";
import shovels from "../data/shovels.json";
import necklaces from "../data/necklaces.json";
import charms from "../data/charms.json";
import rings from "../data/rings.json";
import mutations from "../data/mutations.json";
import enchants from "../data/enchants.json";

export function resolveBuildEquipment(build: BuildState) {
  return {
    pan: pans.find((item) => item.id === build.panId) ?? null,

    shovel: shovels.find((item) => item.id === build.shovelId) ?? null,

    necklace: necklaces.find((item) => item.id === build.necklaceId) ?? null,

    charm: charms.find((item) => item.id === build.charmId) ?? null,

    panEnchant: enchants.find((item) => item.id === build.panEnchantId) ?? null,

    necklaceMutation:
      mutations.find((item) => item.id === build.necklaceMutationId) ?? null,

    charmMutation:
      mutations.find((item) => item.id === build.charmMutationId) ?? null,

    rings: build.rings
      .map((selection: RingSelection) => {
        const ring = rings.find((item) => item.id === selection.ringId) ?? null;

        const mutation =
          mutations.find((item) => item.id === selection.mutationId) ?? null;

        return {
          ...ring,
          mutation,
        };
      })
      .filter(Boolean),
  };
}
