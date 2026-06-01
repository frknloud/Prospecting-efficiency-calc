import { UpgradeCandidate } from "./candidateTypes";
import { EvaluatedBuild } from "./evaluatedTypes";
import { BuildState } from "../engine/types";
import type { AccessSettings } from "../access/accessTypes";

export type OptimizerObjective =
  | "efficiency"
  | "modifierEfficiency"
  | "modifierLuck"
  | "luck"
  | "capacity"
  | "digSpeed"
  | "digStrength"
  | "shakeSpeed"
  | "shakeStrength"
  | "modifierBoost"
  | "sizeBoost"
  | "sellBoost"
  | "walkSpeed"
  | "jumpPower"
  | "inventorySize"
  | "statusTimerSpeed"
  | "treasureMapChance";

export type OptimizerMode = "fast" | "balanced" | "exhaustive";

export type OptimizerStrategy = "standard" | "beam" | "fullBuild";

export type OptimizerTaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "cancelled"
  | "failed";

export type OptimizerResultStreamCallback = (
  results: OptimizerResult[],

  progress: OptimizerProgress,
) => void;

export type ReplaySnapshotPredicate = (
  snapshot: OptimizerSessionSnapshot,
) => boolean;

export interface LockedSlots {
  pan: boolean;

  shovel: boolean;

  necklace: boolean;

  charm: boolean;

  rings: boolean[];

  museum: boolean;
  
  museumSlots: boolean[];
}

export interface OptimizerProgress {
  exploredBuilds: number;

  duplicateBuildSkips: number;

  duplicateResultSkips: number;

  totalGeneratedFrontier: number;

  largestFrontierSize: number;

  currentDepth: number;

  beamWidth: number;

  beamDepth: number;

  resultCount: number;
}

export interface OptimizerSession {
  id: string;

  createdAt: number;

  updatedAt: number;

  tasks: OptimizerTask[];

  latestProgress?: OptimizerProgress;

  latestResults?: OptimizerResult[];

  history: OptimizerSessionSnapshot[];

  stats: OptimizerSessionStats;
}

export interface OptimizerTask {
  id: string;

  status: OptimizerTaskStatus;

  startedAt: number;

  completedAt?: number;

  strategy: OptimizerStrategy;

  request: OptimizerRequest;

  results?: OptimizerResult[];

  cancelRequested?: boolean;

  onProgress?: OptimizerResultStreamCallback;

  error?: string;

  worker?: Worker;
}

export interface OptimizerRequest {
  objective: OptimizerObjective;

  secondaryObjective?: OptimizerObjective;

  minStats?: Partial<Record<string, number>>;

  maxStats?: Partial<Record<string, number>>;

  forceOneTapBuilds?: boolean;

  objectiveRanges?: Partial<Record<OptimizerObjective, { current: number; best: number }>>;

  searchTimeBudgetMs?: number;

  topResults?: number;

  mode?: OptimizerMode;

  baselineEfficiency?: number;
  
  baselineScore?: number;

  strategy?: OptimizerStrategy;

  beamMode?: "fast" | "balanced" | "exhaustive";

  beamWidth?: number;

  beamDepth?: number;

  lockedSlots?: LockedSlots;
  
  accessSettings?: AccessSettings;
}

export interface OptimizerResult {
  candidate?: UpgradeCandidate;

  build: BuildState;

  evaluated: EvaluatedBuild;

  score: number;
}

export interface OptimizerSessionSnapshot {
  timestamp: number;

  progress: OptimizerProgress;

  results: OptimizerResult[];

  sequence: number;

  elapsedMs: number;
}

export interface OptimizerSessionStats {
  totalSnapshots: number;

  totalExploredBuilds: number;

  totalDuplicateBuildSkips: number;

  totalDuplicateResultSkips: number;

  maxFrontierSize: number;

  deepestDepthReached: number;

  bestResultCount: number;
}

export interface SerializedOptimizerSession {
  version: number;

  exportedAt: number;

  session: OptimizerSession;
}

export interface ReplayValidationResult {
  valid: boolean;

  errors: string[];
}

export interface OptimizerWorkerRequest {
  taskId: string;

  build: BuildState;

  request: OptimizerRequest;

  ringSlotLimit: number;
}

export interface OptimizerWorkerResponse {
  type: "progress" | "complete" | "error";

  taskId: string;

  results: OptimizerResult[];

  progress?: OptimizerProgress;

  error?: string;
}

export interface OptimizerWorkerControlMessage {
  type: "cancel";

  taskId: string;
}

export interface RuntimeOptimizerRequest extends OptimizerRequest {
  onProgress?: (
    results: OptimizerResult[],

    progress: OptimizerProgress,
  ) => void;

  cancelRequested?: boolean;
}
