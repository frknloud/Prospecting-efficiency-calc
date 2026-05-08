import { Stats } from '../types';

export interface EfficiencyResult {
  efficiency: number;
  cycleTime: number;
  digsRequired: number;
}

export function calculateEfficiency(
  stats: Stats
): EfficiencyResult {
  const capacity = Math.max(stats.capacity, 1);
  const digStrength = Math.max(stats.digStrength, 1);
  const shakeStrength = Math.max(stats.shakeStrength, 1);
  const shakeSpeed = Math.max(stats.shakeSpeed, 1);
  const digSpeed = Math.max(stats.digSpeed, 1);

  const digsRequired = Math.ceil(
    capacity / (1.5 * digStrength)
  );

  const digTime = 190 / digSpeed;

  const cycleTime =
    capacity / shakeStrength / shakeSpeed +
    1.15 +
    digsRequired * digTime;

  const efficiency =
    (stats.luck * Math.sqrt(capacity)) / cycleTime;

  return {
    efficiency,
    cycleTime,
    digsRequired
  };
}
