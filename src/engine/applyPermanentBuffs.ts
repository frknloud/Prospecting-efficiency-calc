import type { PartialStats, PermanentBuffsState } from "./types";

export interface StatBonusBundle {
  flat: PartialStats;
  multipliers: PartialStats;
}

function addBonus(target: PartialStats, stat: keyof PartialStats, value: number) {
  if (!Number.isFinite(value) || value === 0) {
    return;
  }

  target[stat] = Number(target[stat] ?? 0) + value;
}

export function getPermanentBuffBonuses(
  permanentBuffs?: PermanentBuffsState,
): StatBonusBundle {
  const flat: PartialStats = {};
  const multipliers: PartialStats = {};

  if (!permanentBuffs) {
    return { flat, multipliers };
  }

  if (permanentBuffs.mvpProspector) {
    addBonus(multipliers, "luck", 0.2);
  }

  addBonus(flat, "luck", Number(permanentBuffs.experience ?? 0) * 5);

  if (permanentBuffs.tradersRecommendation) {
    addBonus(flat, "sellBoost", 20);
  }

  if (permanentBuffs.lighthouseBlessing) {
    addBonus(flat, "luck", 3);
  }

  if (permanentBuffs.ancientBlessing) {
    addBonus(flat, "luck", 5);
  }

  if (permanentBuffs.blessingOfTheSpirits) {
    addBonus(flat, "luck", 50);
  }

  addBonus(flat, "luck", Number(permanentBuffs.dredgeMaster ?? 0) * 3);

  const masteryBonus = Number(permanentBuffs.mastery ?? 1) - 1;

  if (masteryBonus > 0) {
    addBonus(multipliers, "luck", masteryBonus);
  }

  return { flat, multipliers };
}
