export interface FinalStats {
  luck: number;
  capacity: number;
  shakeStrength: number;
  shakeSpeed: number;
  digStrength: number;
  digSpeed: number;
  sizeBoost: number;
  modifierBoost: number;
  sellBoost: number;
  walkSpeed: number;
  jumpPower: number;
  inventorySize: number;
  statusTimerSpeed: number;
  treasureMapChance: number;
}

export function emptyStats(): FinalStats {
  return {
    luck: 0,
    capacity: 0,
    shakeStrength: 0,
    shakeSpeed: 0,
    digStrength: 0,
    digSpeed: 0,
    sizeBoost: 0,
    modifierBoost: 0,
    sellBoost: 0,
    walkSpeed: 0,
    jumpPower: 0,
    inventorySize: 0,
    statusTimerSpeed: 0,
    treasureMapChance: 0,
  };
}

export function addStats(target: FinalStats, source?: Partial<FinalStats>) {
  if (!source) {
    return;
  }

  for (const key of Object.keys(source) as (keyof FinalStats)[]) {
    target[key] += source[key] ?? 0;
  }
}
