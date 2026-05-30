import type { Stats } from "./types";

export function satisfiesConstraints(
  stats: Stats,
  constraints?: {
    min?: Partial<Stats>;
    max?: Partial<Stats>;
  },
) {
  if (!constraints) {
    return true;
  }

  for (const [key, value] of Object.entries(constraints.min ?? {})) {
    const stat = stats[key as keyof Stats];

    if (stat < Number(value)) {
      return false;
    }
  }

  for (const [key, value] of Object.entries(constraints.max ?? {})) {
    const stat = stats[key as keyof Stats];

    if (stat > Number(value)) {
      return false;
    }
  }

  return true;
}
