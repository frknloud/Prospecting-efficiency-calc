import type { Stats } from '../../types';

import {
  FIXED_CYCLE_TIME
} from './constants';

import {
  shakeSpeedToR
} from './shakeSpeed';

import {
  digTimePerDig
} from './digTime';

export interface EfficiencyCoreResult {
  efficiency: number;

  cycleTime: number;

  digsRequired: number;

  shakeTime: number;

  timePerDig: number;

  totalDigTime: number;

  totalShakes: number;

  r: number;
}

export function efficiencyCore(
  stats: Stats
): EfficiencyCoreResult {
  const L = stats.luck || 0;

  const C = stats.capacity || 0;

  const DS =
    stats.digStrength || 0;

  const d =
    stats.digSpeed || 0;

  const s =
    stats.shakeStrength || 0;

  const shakeSpeed =
    stats.shakeSpeed || 0;

  if (
    L <= 0 ||
    C <= 0 ||
    DS <= 0 ||
    d <= 0 ||
    s <= 0
  ) {
    return {
      efficiency: 0,
      cycleTime: Infinity,
      digsRequired: Infinity,
      shakeTime: Infinity,
      digTime: Infinity,
      totalShakes: Infinity,
      r: 0
    };
  }

  const r =
    shakeSpeedToR(shakeSpeed);

  const digsRequired =
    Math.max(
      1,
      Math.ceil(
        C / (1.5 * DS)
      )
    );

  const totalShakes =
    C / s;

  const shakeTime =
    totalShakes / r;

  const timePerDig =
    digTimePerDig(d);

  const totalDigTime =
    digsRequired * timePerDig;

  const cycleTime =
    shakeTime +
    FIXED_CYCLE_TIME +
    totalDigTime;

  const efficiency =
    (L * Math.sqrt(C)) /
    cycleTime;

  return {
    efficiency,

    cycleTime,

    digsRequired,

    shakeTime,

    timePerDig,
    
    totalDigTime,

    totalShakes,

    r
  };
}
