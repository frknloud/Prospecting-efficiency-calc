import type { OptimizerMode } from "./types";

export const MODE_CONFIG: Record<
  OptimizerMode,
  {
    maxResults: number;
    candidateLimit: number;
  }
> = {
  fast: {
    maxResults: 10,
    candidateLimit: 250,
  },

  balanced: {
    maxResults: 25,
    candidateLimit: 1000,
  },

  exhaustive: {
    maxResults: 100,
    candidateLimit: 10000,
  },
};
