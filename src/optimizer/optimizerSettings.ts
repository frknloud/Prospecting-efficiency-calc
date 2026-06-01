import type { OptimizerMode, OptimizerObjective, OptimizerStrategy } from "./types";
import type { AccessSettings } from "../access/accessTypes";

import { DEFAULT_ACCESS_SETTINGS } from "../access/accessRules";
import { canPairObjectives, isUserFacingObjective } from "./objectiveRules";

export type DesiredStatConstraintType = "min" | "max";

export type DesiredStatConstraintStat = Exclude<OptimizerObjective, "efficiency" | "modifierEfficiency" | "modifierLuck" | "inventorySize" | "statusTimerSpeed" | "treasureMapChance">;

export interface DesiredStatConstraintRule {
  id: string;

  type: DesiredStatConstraintType;

  stat: DesiredStatConstraintStat;

  value: number;
}

export interface OptimizerSettings {
  objective: OptimizerObjective;

  secondaryObjective?: OptimizerObjective;

  mode: OptimizerMode;

  strategy: OptimizerStrategy;
  
  access: AccessSettings;

  topResults: number;

  autoRun: boolean;

  debounceMs: number;

  desiredStatRules: DesiredStatConstraintRule[];

  forceOneTapBuilds: boolean;
}

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  objective: "efficiency",

  secondaryObjective: undefined,

  mode: "balanced",

  strategy: "fullBuild",
  
  access: DEFAULT_ACCESS_SETTINGS,

  topResults: 10,

  autoRun: false,

  debounceMs: 350,

  desiredStatRules: [],

  forceOneTapBuilds: false,
};

const STORAGE_KEY = "optimizer-settings";

export function loadOptimizerSettings(): OptimizerSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return {
        ...DEFAULT_OPTIMIZER_SETTINGS,
      };
    }

    const parsed = JSON.parse(raw);

    const parsedObjective = parsed.objective === "modifierLuck"
      ? "modifierEfficiency"
      : parsed.objective;

    const normalizedObjective = isUserFacingObjective(parsedObjective)
      ? parsedObjective
      : DEFAULT_OPTIMIZER_SETTINGS.objective;

    const parsedSecondaryObjective = parsed.secondaryObjective === "modifierLuck"
      ? "modifierEfficiency"
      : parsed.secondaryObjective;

    const normalizedSecondaryObjective =
      parsedSecondaryObjective &&
      isUserFacingObjective(parsedSecondaryObjective) &&
      canPairObjectives(normalizedObjective, parsedSecondaryObjective)
        ? parsedSecondaryObjective
        : undefined;

    return {
      ...DEFAULT_OPTIMIZER_SETTINGS,
      ...parsed,
      objective: normalizedObjective,
      secondaryObjective: normalizedSecondaryObjective,

      forceOneTapBuilds: parsed.forceOneTapBuilds === true,

      desiredStatRules: Array.isArray(parsed.desiredStatRules)
        ? parsed.desiredStatRules
            .filter((rule: Partial<DesiredStatConstraintRule>) =>
              (rule.type === "min" || rule.type === "max") &&
              typeof rule.stat === "string"
            )
            .map((rule: Partial<DesiredStatConstraintRule>, index: number) => ({
              id: rule.id ?? `rule-${index + 1}`,
              type: rule.type === "max" ? "max" : "min",
              stat: rule.stat as DesiredStatConstraintStat,
              value: Number.isFinite(Number(rule.value)) ? Number(rule.value) : 0,
            }))
        : [],

      access: {
        ...DEFAULT_ACCESS_SETTINGS,
        ...(parsed.access ?? {}),

        specialAccess: {
          ...DEFAULT_ACCESS_SETTINGS.specialAccess,
          ...(parsed.access?.specialAccess ?? {}),
        },
      },
    };
  } catch {
    return {
      ...DEFAULT_OPTIMIZER_SETTINGS,
    };
  }
}

export function saveOptimizerSettings(settings: OptimizerSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
