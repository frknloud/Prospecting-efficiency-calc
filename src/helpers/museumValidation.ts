import type { MuseumMineral, MuseumModifier } from "../engine/types";

import treasuredDigSites from "../data/treasured.json";

import crystallineDigSites from "../data/crystalline.json";

const TREASURED_ALLOWED_DIG_SITES =
  new Set(treasuredDigSites as string[]);

const CRYSTALLINE_ALLOWED_DIG_SITES =
  new Set(crystallineDigSites as string[]);

type MineralWithDigSites =
  Pick<MuseumMineral, "id" | "name"> & {
    digSites?: string[];
  };

type ModifierIdentity =
  Pick<MuseumModifier, "id" | "name">;

export function isTreasuredModifier(
  modifier?: ModifierIdentity | null,
): boolean {
  return (
    modifier?.id === "treasured" ||
    modifier?.name.toLowerCase() === "treasured"
  );
}

export function isCrystallineModifier(
  modifier?: ModifierIdentity | null,
): boolean {
  return (
    modifier?.id === "crystalline" ||
    modifier?.name.toLowerCase() === "crystalline"
  );
}

export function getModifierAllowedDigSites(
  modifier?: ModifierIdentity | null,
): Set<string> | null {
  if (isTreasuredModifier(modifier)) {
    return TREASURED_ALLOWED_DIG_SITES;
  }

  if (isCrystallineModifier(modifier)) {
    return CRYSTALLINE_ALLOWED_DIG_SITES;
  }

  return null;
}

export function canUseMuseumModifier(
  mineral?: MineralWithDigSites | null,
  modifier?: ModifierIdentity | null,
): boolean {
  if (!modifier) {
    return true;
  }

  const allowedDigSites =
    getModifierAllowedDigSites(modifier);

  if (!allowedDigSites) {
    return true;
  }

  if (!mineral) {
    return true;
  }

  if (!mineral.digSites?.length) {
    return false;
  }

  return mineral.digSites.some(
    digSite => allowedDigSites.has(digSite)
  );
}

export function filterValidMuseumModifiers<
  T extends ModifierIdentity,
>(
  mineral: MineralWithDigSites | null | undefined,
  modifiers: T[],
): T[] {
  return modifiers.filter((modifier) =>
    canUseMuseumModifier(mineral, modifier),
  );
}

export function filterValidMuseumMinerals<
  T extends MineralWithDigSites,
>(
  modifier: ModifierIdentity | null | undefined,
  minerals: T[],
): T[] {
  return minerals.filter((mineral) =>
    canUseMuseumModifier(mineral, modifier),
  );
}
