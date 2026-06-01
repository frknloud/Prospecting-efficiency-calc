import type { Stats } from "../types";

import { FIXED_CYCLE_TIME } from "./constants";

import { shakeSpeedToR } from "./shakeSpeed";

import { digTimePerDig } from "./digTime";

export interface EfficiencyCoreResult {
  efficiency: number;

  modifierLuck: number;

  modifierEfficiency: number;

  cycleTime: number;

  digsRequired: number;

  shakeTime: number;

  timePerDig: number;

  totalDigTime: number;

  totalShakes: number;

  r: number;
}

export function efficiencyCore(stats: Stats): EfficiencyCoreResult {
  const L = stats.luck || 0;

  const C = stats.capacity || 0;

  const DS = stats.digStrength || 0;

  const d = stats.digSpeed || 0;

  const s = stats.shakeStrength || 0;

  const shakeSpeed = stats.shakeSpeed || 0;

  if (L <= 0 || C <= 0 || DS <= 0 || d <= 0 || s <= 0) {
    return {
      efficiency: 0,
      modifierLuck: 0,
      modifierEfficiency: 0,
      cycleTime: Infinity,
      digsRequired: Infinity,
      shakeTime: Infinity,
      timePerDig: Infinity,
      totalDigTime: Infinity,
      totalShakes: Infinity,
      r: 0,
    };
  }

  const r = shakeSpeedToR(shakeSpeed);

  const digsRequired = Math.max(1, Math.ceil(C / (1.5 * DS)));

  const totalShakes = C / s;

  const shakeTime = totalShakes / r;

  const timePerDig = digTimePerDig(d);

  const totalDigTime = digsRequired * timePerDig;

  const cycleTime = shakeTime + FIXED_CYCLE_TIME + totalDigTime;

  const modifierBoost = stats.modifierBoost || 0;

  const modifierLuckNumerator =
    ((L / 1000) + (modifierBoost / 10)) *
    (0.05 + 0.95 * Math.min(modifierBoost / 1900, 1));

  const efficiency = (L * Math.sqrt(C)) / cycleTime;

  const modifierLuck = modifierLuckNumerator;

  const modifierEfficiency = (modifierLuck * Math.sqrt(C)) / cycleTime;

  return {
    efficiency,

    modifierLuck,

    modifierEfficiency,

    cycleTime,

    digsRequired,

    shakeTime,

    timePerDig,

    totalDigTime,

    totalShakes,

    r,
  };
}
