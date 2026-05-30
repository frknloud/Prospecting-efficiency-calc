import consumables from "../data/consumables.json";

import type { ConsumablesState, PartialStats } from "./types";

interface ConsumableDataItem {
  id: string;
  name: string;
  flat?: PartialStats;
  multipliers?: PartialStats;
}

interface ConsumablesData {
  boostRelics: ConsumableDataItem[];
  potions: ConsumableDataItem[];
}

export interface StatBonusBundle {
  flat: PartialStats;
  multipliers: PartialStats;
}

export interface ConsumableBonusAmplifier {
  flat?: PartialStats;
  multipliers?: PartialStats;
}

export type ConsumableBonusAmplifiers = Record<string, ConsumableBonusAmplifier>;

function addStats(target: PartialStats, source?: PartialStats) {
  if (!source) {
    return;
  }

  for (const [statKey, value] of Object.entries(source)) {
    const key = statKey as keyof PartialStats;

    target[key] = Number(target[key] ?? 0) + Number(value ?? 0);
  }
}

export function getConsumableBonuses(
  selectedConsumables?: ConsumablesState,
  bonusAmplifiers: ConsumableBonusAmplifiers = {},
): StatBonusBundle {
  const flat: PartialStats = {};
  const multipliers: PartialStats = {};

  if (!selectedConsumables) {
    return { flat, multipliers };
  }

  const data = consumables as ConsumablesData;

  for (const category of ["boostRelics", "potions"] as const) {
    const selectedIds = new Set(selectedConsumables[category] ?? []);

    for (const consumable of data[category]) {
      if (!selectedIds.has(consumable.id)) {
        continue;
      }

      const amplifiers = bonusAmplifiers[consumable.id];

      addStats(flat, consumable.flat);
      addStats(multipliers, consumable.multipliers);

      // Equipment-specific consumable bonuses are additive bonus deltas that
      // only exist when the matching consumable is selected. They do not scale
      // the consumable's flat values. For example, Luminant Totem always keeps
      // its +50 flat digSpeed/shakeSpeed, while Nebula Pan/Starcrusher add
      // extra global multiplier deltas for capacity, digSpeed, and shakeSpeed.
      addStats(flat, amplifiers?.flat);
      addStats(multipliers, amplifiers?.multipliers);
    }
  }

  return { flat, multipliers };
}
