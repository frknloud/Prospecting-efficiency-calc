export interface Stats {
  luck: number;
  capacity: number;
  shakeStrength: number;
  shakeSpeed: number;
  digStrength: number;
  digSpeed: number;
}

export interface EquipmentItem {
  id: string;
  name: string;
  slot: string;
  stats: Partial<Stats>;
}

export interface Mutation {
  id: string;
  name: string;
  multipliers?: Partial<Stats>;
  flat?: Partial<Stats>;
}

export interface Enchant {
  id: string;
  name: string;
  stats?: Partial<Stats>;
}

export interface MuseumMineral {
  id: string;
  name: string;
  multipliers?: Partial<Stats>;
  flat?: Partial<Stats>;
}

export interface MuseumModifier {
  id: string;
  name: string;
  multipliers?: Partial<Stats>;
  flat?: Partial<Stats>;
}

export interface BuildResult {
  finalStats: Stats;
  efficiency: number;
  cycleTime: number;
  digsRequired: number;
}
