import type { EquipmentItem } from '../types';

export function filterAvailableRings(
  rings: EquipmentItem[],
  selectedRings: Array<string | null>,
  currentIndex: number
) {
  return rings.filter((ring) => {
    if (!ring.unique) return true;

    return !selectedRings.some(
      (ringId, index) =>
        index !== currentIndex &&
        ringId === ring.id
    );
  });
}
