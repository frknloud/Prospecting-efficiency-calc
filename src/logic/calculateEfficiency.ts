import type { Stats } from '../types';

import {
  efficiencyCore
} from './engine/efficiencyCore';

export interface EfficiencyResult {
  efficiency: number;
  cycleTime: number;
  digsRequired: number;
}

export function calculateEfficiency(
  stats: Stats
): EfficiencyResult {
  const result =
    efficiencyCore(stats);

  return {
    efficiency: result.efficiency,
    cycleTime: result.cycleTime,
    digsRequired: result.digsRequired
  };
}
