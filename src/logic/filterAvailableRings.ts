interface RingItem {
  id: string;
  name: string;
  unique?: boolean;
}

export function filterAvailableRings(
  allRings: RingItem[],
  selectedRingIds: Array<string | null>,
  currentIndex: number
): RingItem[] {
  const selectedUniqueIds = new Set(
    selectedRingIds.filter(
      (ringId, index) =>
        index !== currentIndex && ringId !== null
    )
  );

  return allRings.filter((ring) => {
    if (!ring.unique) {
      return true;
    }

    return !selectedUniqueIds.has(ring.id);
  });
}
