import regionsData from "../data/regions.json";

import type {
  AccessControlledItem,
  AccessSettings,
  DigSiteControlledItem,
  RegionDefinition,
  SpecialAccessKey,
} from "./accessTypes";

const regions = regionsData as RegionDefinition[];

export const DEFAULT_ACCESS_SETTINGS: AccessSettings = {
  region: "meteorValley",

  includeLimitedTime: true,

  specialAccess: {
    dredgeMastersRing: true,

    ringOfChampions: true,

    ringOfTheStars: true,

    clockwork: true,
  },
};

export const SPECIAL_ACCESS_LABELS: Record<SpecialAccessKey, string> = {
  dredgeMastersRing: "Dredge Master's Ring",

  ringOfChampions: "Ring of Champions",

  ringOfTheStars: "Ring of the Stars",

  clockwork: "Clockwork",
};

export function getRegionDefinitions(): RegionDefinition[] {
  return regions;
}

export function getSelectableRegionDefinitions(): RegionDefinition[] {
  return regions.filter(
    region => region.region !== "start"
  );
}

export function getRegionIndex(region: string | undefined): number {
  if (!region) {
    return -1;
  }

  return regions.findIndex(
    regionDefinition =>
      regionDefinition.region === region
  );
}

export function isRegionUnlocked(
  requiredRegion: string | undefined,
  selectedRegion: string,
): boolean {
  if (!requiredRegion) {
    return true;
  }

  const requiredIndex = getRegionIndex(requiredRegion);

  const selectedIndex = getRegionIndex(selectedRegion);

  if (requiredIndex < 0 || selectedIndex < 0) {
    return false;
  }

  return requiredIndex <= selectedIndex;
}

export function areMutationsAccessible(
  accessSettings: AccessSettings,
): boolean {
  return isRegionUnlocked(
    "snowyMountain",
    accessSettings.region,
  );
}

export function getUnlockedDigSites(
  accessSettings: AccessSettings,
): Set<string> {
  const unlockedDigSites = new Set<string>();

  for (const region of regions) {
    if (
      region.region !== "start" &&
      !isRegionUnlocked(
        region.region,
        accessSettings.region,
      )
    ) {
      continue;
    }

    for (const digSite of region.digSites ?? []) {
      unlockedDigSites.add(digSite);
    }

    if (accessSettings.includeLimitedTime) {
      for (const digSite of region.limitedTimeDigSites ?? []) {
        unlockedDigSites.add(digSite);
      }
    }
  }

  return unlockedDigSites;
}

export function hasUnlockedDigSite(
  item: DigSiteControlledItem,
  accessSettings: AccessSettings,
): boolean {
  if (!item.digSites?.length) {
    return true;
  }

  const unlockedDigSites = getUnlockedDigSites(accessSettings);

  return item.digSites.some(
    digSite => unlockedDigSites.has(digSite)
  );
}

export function isItemAccessible(
  item: AccessControlledItem,
  accessSettings: AccessSettings,
): boolean {
  if (item.limitedTime && !accessSettings.includeLimitedTime) {
    return false;
  }

  if (!isRegionUnlocked(item.region, accessSettings.region)) {
    return false;
  }

  if (item.specialAccess) {
    return accessSettings.specialAccess[item.specialAccess] === true;
  }

  return true;
}

export function isMuseumMineralAccessible(
  mineral: DigSiteControlledItem,
  accessSettings: AccessSettings,
): boolean {
  if (!isItemAccessible(mineral, accessSettings)) {
    return false;
  }

  return hasUnlockedDigSite(mineral, accessSettings);
}
