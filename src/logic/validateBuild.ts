export function findDuplicateItems(
  items: Array<string | null>
): string[] {
  const counts: Record<string, number> = {};

  items.forEach((item) => {
    if (!item) return;

    counts[item] = (counts[item] ?? 0) + 1;
  });

  return Object.entries(counts)
    .filter(([, count]) => count > 1)
    .map(([name]) => name);
}
