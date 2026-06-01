export const STAT_LABELS: Record<string, string> = {
  efficiency: "Efficiency",
  modifierEfficiency: "Modifier Efficiency",
  modifierLuck: "Modifier Luck",
  luck: "Luck",
  capacity: "Capacity",
  shakeStrength: "Shake Strength",
  shakeSpeed: "Shake Speed",
  digStrength: "Dig Strength",
  digSpeed: "Dig Speed",
  sizeBoost: "Size Boost",
  modifierBoost: "Modifier Boost",
  sellBoost: "Sell Boost",
  walkSpeed: "Walk Speed",
  jumpPower: "Jump Power",
  inventorySize: "Inventory Size",
  statusTimerSpeed: "Status Timer Speed",
  treasureMapChance: "Treasure Map Chance",
};

export function formatStatLabel(statKey: string): string {
  if (STAT_LABELS[statKey]) {
    return STAT_LABELS[statKey];
  }

  return statKey
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
