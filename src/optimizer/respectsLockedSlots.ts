import type {
  BuildState,
} from "../engine/types";

import type {
  LockedSlots,
} from "./types";

function sameValue(
  a: string | null | undefined,
  b: string | null | undefined
) {
  return (
    (a ?? null) ===
    (b ?? null)
  );
}

export function respectsLockedSlots(
  currentBuild: BuildState,
  resultBuild: BuildState,
  lockedSlots: LockedSlots
): boolean {

  if (
    lockedSlots.pan &&
    (
      !sameValue(
        currentBuild.panId,
        resultBuild.panId
      ) ||
      !sameValue(
        currentBuild.panEnchantId,
        resultBuild.panEnchantId
      )
    )
  ) {
    return false;
  }

  if (
    lockedSlots.shovel &&
    !sameValue(
      currentBuild.shovelId,
      resultBuild.shovelId
    )
  ) {
    return false;
  }

  if (
    lockedSlots.necklace &&
    (
      !sameValue(
        currentBuild.necklaceId,
        resultBuild.necklaceId
      ) ||
      !sameValue(
        currentBuild.necklaceMutationId,
        resultBuild.necklaceMutationId
      )
    )
  ) {
    return false;
  }

  if (
    lockedSlots.charm &&
    (
      !sameValue(
        currentBuild.charmId,
        resultBuild.charmId
      ) ||
      !sameValue(
        currentBuild.charmMutationId,
        resultBuild.charmMutationId
      )
    )
  ) {
    return false;
  }

  for (
    let index = 0;
    index < lockedSlots.rings.length;
    index++
  ) {
    if (
      !lockedSlots.rings[index]
    ) {
      continue;
    }

    const currentRing =
      currentBuild.rings[index];

    const resultRing =
      resultBuild.rings[index];

    if (
      !sameValue(
        currentRing?.ringId,
        resultRing?.ringId
      ) ||
      !sameValue(
        currentRing?.mutationId,
        resultRing?.mutationId
      )
    ) {
      return false;
    }
  }


  for (
    let index = 0;
    index < lockedSlots.museumSlots.length;
    index++
  ) {
    if (
      !lockedSlots.museumSlots[index]
    ) {
      continue;
    }

    const currentSlot =
      currentBuild.museumSlots[index];

    const resultSlot =
      resultBuild.museumSlots.find(
        slot =>
          slot.slotId ===
          currentSlot?.slotId
      );

    if (
      !sameValue(
        currentSlot?.mineralId,
        resultSlot?.mineralId
      ) ||
      !sameValue(
        currentSlot?.modifierId,
        resultSlot?.modifierId
      )
    ) {
      return false;
    }
  }

  return true;
}

