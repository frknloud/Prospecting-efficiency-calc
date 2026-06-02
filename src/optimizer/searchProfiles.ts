import { isRegionUnlocked } from "../access/accessRules";

import type { AccessSettings } from "../access/accessTypes";

export interface OptimizerSearchProfile {
  id: string;
  minimumRegion?: string;
  accessoryRarities?: Set<string>;
  mutationIds?: Set<string>;
  enchantIds?: Set<string>;
  alwaysAllowItemIds: Set<string>;
  alwaysAllowMutationIds: Set<string>;
  alwaysAllowEnchantIds: Set<string>;
}

export const DEFAULT_OPTIMIZER_SEARCH_PROFILE: OptimizerSearchProfile = {
  id: "default",
  alwaysAllowItemIds: new Set(),
  alwaysAllowMutationIds: new Set(),
  alwaysAllowEnchantIds: new Set(),
};

export const ENDGAME_OPTIMIZER_SEARCH_PROFILE: OptimizerSearchProfile = {
  id: "endgame-rotwood-swamp",
  minimumRegion: "rotwoodSwamp",
  accessoryRarities: new Set(["mythic", "exotic", "ascended"]),
  mutationIds: new Set(["prismatic"]),
  enchantIds: new Set([
    "cursed",
    "devouring",
    "hyperspeed",
    "irregular",
    "mystical",
    "starstruck",
  ]),
  alwaysAllowItemIds: new Set(),
  alwaysAllowMutationIds: new Set(),
  alwaysAllowEnchantIds: new Set(),
};

export function getOptimizerSearchProfile(
  accessSettings: AccessSettings,
): OptimizerSearchProfile {
  if (
    isRegionUnlocked(
      ENDGAME_OPTIMIZER_SEARCH_PROFILE.minimumRegion,
      accessSettings.region,
    )
  ) {
    return ENDGAME_OPTIMIZER_SEARCH_PROFILE;
  }

  return DEFAULT_OPTIMIZER_SEARCH_PROFILE;
}

export function isEndgameOptimizerSearchProfile(
  profile: OptimizerSearchProfile,
): boolean {
  return profile.id === ENDGAME_OPTIMIZER_SEARCH_PROFILE.id;
}

export function isOptimizerAccessoryAllowed(
  item: { id?: string; rarity?: string | null | undefined },
  profile: OptimizerSearchProfile,
): boolean {
  if (item.id && profile.alwaysAllowItemIds.has(item.id)) {
    return true;
  }

  if (!profile.accessoryRarities) {
    return true;
  }

  return profile.accessoryRarities.has(String(item.rarity ?? "").toLowerCase());
}

export function isOptimizerShovelAllowed(
  item: { id?: string; region?: string | null | undefined },
  accessSettings: AccessSettings,
): boolean {
  const itemRegion = String(item.region ?? "");

  if (!itemRegion || itemRegion === "start") {
    return false;
  }

  return itemRegion === accessSettings.region;
}

export function isOptimizerMutationAllowed(
  mutationId: string | null | undefined,
  profile: OptimizerSearchProfile,
): boolean {
  if (!mutationId) {
    return !profile.mutationIds;
  }

  if (profile.alwaysAllowMutationIds.has(mutationId)) {
    return true;
  }

  if (!profile.mutationIds) {
    return true;
  }

  return profile.mutationIds.has(mutationId);
}


export function isOptimizerEnchantAllowed(
  enchantId: string | null | undefined,
  profile: OptimizerSearchProfile,
): boolean {
  if (!enchantId) {
    return !profile.enchantIds;
  }

  if (profile.alwaysAllowEnchantIds.has(enchantId)) {
    return true;
  }

  if (!profile.enchantIds) {
    return true;
  }

  return profile.enchantIds.has(enchantId);
}
