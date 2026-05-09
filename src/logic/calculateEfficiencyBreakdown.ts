import type { Stats } from '../types/index';

interface EfficiencyBreakdown {
  numerator: {
    luck: number;
    capacity: number;
    sqrtCapacity: number;
    total: number;
  };

  shake: {
    capacity: number;
    shakeStrength: number;
    shakeSpeed: number;

    shakesRequired: number;
    duration: number;
  };

  dig: {
    digStrength: number;
    digSpeed: number;

    digsRequired: number;
    timePerDig: number;
    duration: number;
  };

  denominator: {
    baseDelay: number;
    total: number;
  };

  finalEfficiency: number;
}

export function calculateEfficiencyBreakdown(
  stats: Stats
): EfficiencyBreakdown {
  const luck = stats.luck || 0;
  const capacity = stats.capacity || 1;

  const shakeStrength = stats.shakeStrength || 1;
  const shakeSpeed = stats.shakeSpeed || 1;

  const digStrength = stats.digStrength || 1;
  const digSpeed = stats.digSpeed || 1;

  const sqrtCapacity = Math.sqrt(capacity);

  const numerator = luck * sqrtCapacity;

  const shakesRequired = capacity / shakeStrength;

  const shakeDuration = shakesRequired / shakeSpeed;

  const digsRequired = Math.max(
    1,
    Math.ceil(capacity / digStrength)
  );

  const timePerDig = 10 / digSpeed;

  const digDuration = digsRequired * timePerDig;

  const baseDelay = 1.15;

  const denominator =
    shakeDuration +
    digDuration +
    baseDelay;

  const finalEfficiency =
    numerator / denominator;

  return {
    numerator: {
      luck,
      capacity,
      sqrtCapacity,
      total: numerator
    },

    shake: {
      capacity,
      shakeStrength,
      shakeSpeed,

      shakesRequired,
      duration: shakeDuration
    },

    dig: {
      digStrength,
      digSpeed,

      digsRequired,
      timePerDig,
      duration: digDuration
    },

    denominator: {
      baseDelay,
      total: denominator
    },

    finalEfficiency
  };
}
