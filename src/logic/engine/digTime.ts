import {
  DIG_TIME_COEFFICIENT,
  DIG_SPEED_EXPONENT
} from './constants';

export function digTimePerDig(
  digSpeed: number
): number {
  if (digSpeed <= 0) {
    return Infinity;
  }

  return (
    DIG_TIME_COEFFICIENT *
    Math.pow(
      digSpeed,
      DIG_SPEED_EXPONENT
    )
  );
}
