export type StatKey =
  | "luck"
  | "capacity"
  | "shakeStrength"
  | "shakeSpeed"
  | "digStrength"
  | "digSpeed"
  | "sizeBoost"
  | "modifierBoost"
  | "sellBoost"
  | "walkSpeed"
  | "jumpPower"
  | "inventorySize"
  | "statusTimerSpeed"
  | "treasureMapChance";

export type Rarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary"
  | "mythic"
  | "exotic";

export type Stats = Record<StatKey, number>;

export type PartialStats = Partial<Record<StatKey, number>>;

export interface EquipmentItem {
  id: string;
  name: string;
  slot: string;
  stats: PartialStats;
  multipliers?: PartialStats;
  consumableBonusAmplifiers?: Record<
    string,
    {
      flat?: PartialStats;
      multipliers?: PartialStats;
    }
  >;
  unique?: boolean;
}

export interface Mutation {
  id: string;
  name: string;
  multiplier?: number;
  multipliers?: PartialStats;
  flat?: PartialStats;
}

export interface Enchant {
  id: string;
  name: string;
  allowedSlots?: string;
  flat?: PartialStats;
  multiplier?: PartialStats;
}

export interface MuseumMineral {
  id: string;
  name: string;
  rarity: Rarity;
  stats: PartialStats;
  minWeight?: number;
  region?: string;
  digSites?: string[];
  limitedTime?: boolean;
}

export interface MuseumModifier {
  id: string;
  name: string;
  affects: StatKey[];
  isDouble?: boolean;
  limitedTime?: boolean;
}

export interface MuseumConfig {
  stats: StatKey[];
  constraints: {
    uniqueMinerals: boolean;
    enforceRarityMatch: boolean;
  };
  raritySlots: Record<Rarity, number>;
  rarityModifierBonus: Record<Rarity, number>;
}

export interface MuseumSlotDefinition {
  slotId: number;
  rarity: Rarity;
}

export interface MuseumSlotSelection extends MuseumSlotDefinition {
  mineralId: string | null;
  modifierId: string | null;
}

export interface RingSelection {
  ringId: string | null;
  mutationId: string | null;
}

export interface PermanentBuffsState {
  mvpProspector: boolean;
  experience: number;
  tradersRecommendation: boolean;
  lighthouseBlessing: boolean;
  ancientBlessing: boolean;
  blessingOfTheSpirits: boolean;
  dredgeMaster: number;
  mastery: number;
}

export interface ConsumablesState {
  boostRelics: string[];
  potions: string[];
}

export interface BuildState {
  panId: string | null;
  panEnchantId: string | null;
  shovelId: string | null;
  necklaceId: string | null;
  necklaceMutationId: string | null;
  charmId: string | null;
  charmMutationId: string | null;
  rings: RingSelection[];
  museumSlots: MuseumSlotSelection[];
  permanentBuffs?: PermanentBuffsState;
  selectedConsumables?: ConsumablesState;
}

export interface BuildResult {
  finalStats: Stats;
  efficiency: number;
  cycleTime: number;
  digsRequired: number;
}
