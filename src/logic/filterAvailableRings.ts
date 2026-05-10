import type { EquipmentItem } from '../types';

export function filterAvailableRings(
  rings: EquipmentItem[],
  selectedRings: Array<string | null>,
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

    const ringId = ring.id ?? ring.name;

    return !selectedUniqueIds.has(ringId);
  });
}
