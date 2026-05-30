export type SpecialAccessKey =
  | "dredgeMastersRing"
  | "ringOfChampions"
  | "ringOfTheStars"
  | "clockwork";

export interface AccessSettings {
  region: string;

  includeLimitedTime: boolean;

  specialAccess: Record<SpecialAccessKey, boolean>;
}

export interface RegionDefinition {
  region: string;

  name: string | null;

  digSites?: string[];

  limitedTimeDigSites?: string[];
}

export interface AccessControlledItem {
  region?: string;

  limitedTime?: boolean;

  specialAccess?: SpecialAccessKey;
}

export interface DigSiteControlledItem extends AccessControlledItem {
  digSites?: string[];
}
