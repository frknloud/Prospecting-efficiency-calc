import { FinalStats } from "./calculateFinalStats";

export function calculateEfficiency(stats: FinalStats) {
  const shakePower = stats.shakeStrength * stats.shakeSpeed;

  const digPower = stats.digStrength * stats.digSpeed;

  return (
    shakePower * 0.35 +
    digPower * 0.35 +
    stats.luck * 0.2 +
    stats.capacity * 0.1
  );
}
