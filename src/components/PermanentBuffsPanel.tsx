import ToggleCard from "./ToggleCard";

import type { AccessSettings } from "../access/accessTypes";
import { isRegionUnlocked } from "../access/accessRules";

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

interface RegionLockedPermanentBuff {
  id:
    | "tradersRecommendation"
    | "lighthouseBlessing"
    | "ancientBlessing"
    | "blessingOfTheSpirits";
  label: string;
  requiredRegion: string;
}

export const REGION_LOCKED_PERMANENT_BUFFS: RegionLockedPermanentBuff[] = [
  {
    id: "tradersRecommendation",
    label: "Trader's Recommendation",
    requiredRegion: "rubbleCreek",
  },
  {
    id: "lighthouseBlessing",
    label: "Lighthouse Blessing",
    requiredRegion: "fortuneRiver",
  },
  {
    id: "ancientBlessing",
    label: "Ancient Blessing",
    requiredRegion: "crystalCavern",
  },
  {
    id: "blessingOfTheSpirits",
    label: "Blessing of the Spirits",
    requiredRegion: "overgrownCaves",
  },
];

export const MASTERY_OPTIONS = [
  { value: 1, label: "x1" },
  { value: 1.05, label: "x1.05" },
  { value: 1.1, label: "x1.10" },
  { value: 1.15, label: "x1.15" },
  { value: 1.2, label: "x1.2" },
  { value: 1.25, label: "x1.25" },
] as const;

export function createDefaultPermanentBuffs(
  accessSettings: AccessSettings,
): PermanentBuffsState {
  return {
    mvpProspector: false,
    experience: 0,
    tradersRecommendation: isRegionUnlocked(
      "rubbleCreek",
      accessSettings.region,
    ),
    lighthouseBlessing: isRegionUnlocked(
      "fortuneRiver",
      accessSettings.region,
    ),
    ancientBlessing: isRegionUnlocked(
      "crystalCavern",
      accessSettings.region,
    ),
    blessingOfTheSpirits: isRegionUnlocked(
      "overgrownCaves",
      accessSettings.region,
    ),
    dredgeMaster: 0,
    mastery: 1,
  };
}

export function sanitizePermanentBuffsForAccess(
  buffs: PermanentBuffsState,
  accessSettings: AccessSettings,
): PermanentBuffsState {
  const next = {
    ...buffs,
  };

  for (const buff of REGION_LOCKED_PERMANENT_BUFFS) {
    if (!isRegionUnlocked(buff.requiredRegion, accessSettings.region)) {
      next[buff.id] = false;
    }
  }

  return next;
}

interface Props {
  accessSettings: AccessSettings;
  permanentBuffs: PermanentBuffsState;
  setPermanentBuffs: React.Dispatch<React.SetStateAction<PermanentBuffsState>>;
}

function numberInputValue(value: number): string {
  return Number.isFinite(value) ? String(value) : "0";
}

function parseNumberOnlyInput(value: string): number {
  if (value.trim() === "") {
    return 0;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

export default function PermanentBuffsPanel({
  accessSettings,
  permanentBuffs,
  setPermanentBuffs,
}: Props) {
  function toggleBooleanBuff(key: keyof PermanentBuffsState) {
    setPermanentBuffs((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function updateNumberBuff(
    key: "experience" | "dredgeMaster",
    value: string,
  ) {
    setPermanentBuffs((previous) => ({
      ...previous,
      [key]: parseNumberOnlyInput(value),
    }));
  }

  return (
    <div className="pt-3 border-t border-slate-700 space-y-3">
      <h3 className="text-lg font-semibold">Permanent Buffs</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <ToggleCard
          label="MVP - Prospector"
          enabled={permanentBuffs.mvpProspector}
          onToggle={() => toggleBooleanBuff("mvpProspector")}
        />

        <label className="block rounded-xl p-4 bg-slate-700 border border-slate-600">
          <span className="block font-medium mb-2">Experience - Login Bonus</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={numberInputValue(permanentBuffs.experience)}
            onChange={(event) =>
              updateNumberBuff("experience", event.target.value)
            }
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
          />
        </label>

        {REGION_LOCKED_PERMANENT_BUFFS.map((buff) => {
          const accessible = isRegionUnlocked(
            buff.requiredRegion,
            accessSettings.region,
          );

          return (
            <ToggleCard
              key={buff.id}
              label={buff.label}
              enabled={accessible && permanentBuffs[buff.id]}
              disabled={!accessible}
              onToggle={() => toggleBooleanBuff(buff.id)}
            />
          );
        })}

        <label className="block rounded-xl p-4 bg-slate-700 border border-slate-600">
          <span className="block font-medium mb-2">Dredge Master Quests Completed</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={numberInputValue(permanentBuffs.dredgeMaster)}
            onChange={(event) =>
              updateNumberBuff("dredgeMaster", event.target.value)
            }
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
          />
        </label>

        <label className="block rounded-xl p-4 bg-slate-700 border border-slate-600">
          <span className="block font-medium mb-2">Mastery</span>
          <select
            value={permanentBuffs.mastery}
            onChange={(event) =>
              setPermanentBuffs((previous) => ({
                ...previous,
                mastery: Number(event.target.value),
              }))
            }
            className="w-full rounded-lg bg-slate-900 border border-slate-600 px-3 py-2 text-white"
          >
            {MASTERY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
