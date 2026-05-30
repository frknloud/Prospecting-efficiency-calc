export const BEAM_MODE_CONFIG = {
  fast: {
    beamWidth: 3,
    beamDepth: 2,
  },

  balanced: {
    beamWidth: 5,
    beamDepth: 3,
  },

  exhaustive: {
    beamWidth: 10,
    beamDepth: 5,
  },
} as const;
