import { useMemo, useState } from "react";
import { RefreshCw, Lock } from "lucide-react";

import pans from "../data/pans.json";
import shovels from "../data/shovels.json";
import necklaces from "../data/necklaces.json";
import charms from "../data/charms.json";
import rings from "../data/rings.json";
import enchants from "../data/enchants.json";
import mutations from "../data/mutations.json";
import museumMinerals from "../data/museum-minerals.json";
import museumModifiers from "../data/museum-modifiers.json";

import { useEvaluatedBuild } from "../hooks/useEvaluatedBuild";
import { compareBuilds } from "../optimizer/compareBuilds";
import { formatStatLabel } from "../utils/statLabels";

import { OPTIMIZER_OBJECTIVES } from "../optimizer/objectives";
import { canPairObjectives, getAllowedSecondaryObjectives, isMovementObjective } from "../optimizer/objectiveRules";
import type {
  OptimizerSettings,
  DesiredStatConstraintRule,
  DesiredStatConstraintStat,
  DesiredStatConstraintType,
} from "../optimizer/optimizerSettings";
import type { LockedSlots, OptimizerObjective } from "../optimizer/types";
import type { MuseumSlotSelection } from "../engine/types";

function formatName(
  id: string | null | undefined,
  items: Array<{
    id: string;
    name: string;
  }>,
) {
  if (!id) {
    return "None";
  }

  return items.find((item) => item.id === id)?.name ?? id;
}

function isDifferent(
  currentValue: string | null | undefined,
  resultValue: string | null | undefined,
) {
  return (currentValue ?? null) !== (resultValue ?? null);
}

function buildRowClass(changed: boolean) {
  return changed ? "text-emerald-300 font-semibold" : "";
}

function museumSlotChanged(
  currentSlot:
    | {
        mineralId: string | null;
        modifierId: string | null;
      }
    | undefined,
  resultSlot:
    | {
        mineralId: string | null;
        modifierId: string | null;
      }
    | undefined,
) {
  return (
    (currentSlot?.mineralId ?? null) !== (resultSlot?.mineralId ?? null) ||
    (currentSlot?.modifierId ?? null) !== (resultSlot?.modifierId ?? null)
  );
}


function LoadingProgressBar() {
  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
      </div>

      <div className="text-sm text-indigo-300">Running optimizer...</div>
    </div>
  );
}

function lockBadge(locked: boolean) {
  if (!locked) {
    return null;
  }

  return (
    <span
      title="Locked"
      aria-label="Locked"
      className="mr-2 inline-flex items-center justify-center bg-yellow-500 text-black rounded w-4 h-4 align-middle"
    >
      <Lock size={12} />
    </span>
  );
}

function getChangedSlots(
  currentBuild: any,
  resultBuild: any
) {
  const changed: string[] = [];

  if (
    isDifferent(
      currentBuild.panId,
      resultBuild.panId
    )
  ) {
    changed.push("Pan");
  }

  if (
    isDifferent(
      currentBuild.panEnchantId,
      resultBuild.panEnchantId
    )
  ) {
    changed.push("Pan Enchant");
  }

  if (
    isDifferent(
      currentBuild.shovelId,
      resultBuild.shovelId
    )
  ) {
    changed.push("Shovel");
  }

  if (
    isDifferent(
      currentBuild.necklaceId,
      resultBuild.necklaceId
    )
  ) {
    changed.push("Necklace");
  }

  if (
    isDifferent(
      currentBuild.necklaceMutationId,
      resultBuild.necklaceMutationId
    )
  ) {
    changed.push("Necklace Mutation");
  }

  if (
    isDifferent(
      currentBuild.charmId,
      resultBuild.charmId
    )
  ) {
    changed.push("Charm");
  }

  if (
    isDifferent(
      currentBuild.charmMutationId,
      resultBuild.charmMutationId
    )
  ) {
    changed.push("Charm Mutation");
  }

  resultBuild.rings.forEach(
    (
      ring: {
        ringId: string | null;
        mutationId: string | null;
      },
      index: number
    ) => {
      const currentRing =
        currentBuild.rings[index];

      if (
        isDifferent(
          currentRing?.ringId,
          ring.ringId
        )
      ) {
        changed.push(
          `Ring ${index + 1}`
        );
      }

      if (
        isDifferent(
          currentRing?.mutationId,
          ring.mutationId
        )
      ) {
        changed.push(
          `Ring ${index + 1} Mutation`
        );
      }
    }
  );

  resultBuild.museumSlots?.forEach(
    (
      slot: {
        slotId: number;
        mineralId: string | null;
        modifierId: string | null;
      }
    ) => {

      const currentSlot =
        currentBuild.museumSlots?.find(
          (
            current: {
              slotId: number;
              mineralId: string | null;
              modifierId: string | null;
            }
          ) =>
            current.slotId ===
            slot.slotId
        );

      if (
        isDifferent(
          currentSlot?.mineralId,
          slot.mineralId
        )
      ) {
        changed.push(
          `Museum Slot ${slot.slotId} Mineral`
        );
      }

      if (
        isDifferent(
          currentSlot?.modifierId,
          slot.modifierId
        )
      ) {
        changed.push(
          `Museum Slot ${slot.slotId} Modifier`
        );
      }
    }
  );

  return changed;
}

function getFinalStatEntries(evaluatedBuild: any) {
  return Object.entries(evaluatedBuild.stats ?? {}).flatMap(([key, value]) => {
    const entries = [
      {
        key,
        label: formatStatLabel(key),
        value: Number(value ?? 0),
      },
    ];

    if (key === "luck") {
      entries.push({
        key: "modifierLuck",
        label: formatStatLabel("modifierLuck"),
        value: Number(evaluatedBuild.modifierLuck ?? 0),
      });
    }

    return entries;
  });
}


function getObjectiveValue(
  result: any,
  objective: string
): number {

  if (
    objective === "efficiency"
  ) {
    return Number(
      result.evaluated?.efficiency ?? 0
    );
  }

  if (
    objective === "modifierEfficiency"
  ) {
    return Number(
      result.evaluated?.modifierEfficiency ?? 0
    );
  }

  if (
    objective === "modifierLuck"
  ) {
    return Number(
      result.evaluated?.modifierLuck ?? 0
    );
  }

  return Number(
    result.evaluated?.stats?.[objective] ?? 0
  );
}

function getObjectiveLabel(
  objective: OptimizerObjective
): string {
  return (
    OPTIMIZER_OBJECTIVES.find(
      option =>
        option.value === objective
    )?.label ?? objective
  );
}

function formatSignedNumber(
  value: number,
  decimals = 2
): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(decimals)}`;
}


const DESIRED_STAT_OPTIONS = OPTIMIZER_OBJECTIVES.filter(
  (objective): objective is {
    value: DesiredStatConstraintStat;
    label: string;
  } => objective.value !== "efficiency" && objective.value !== "modifierEfficiency" && objective.value !== "modifierLuck",
);

function createDesiredStatRule(index: number): DesiredStatConstraintRule {
  return {
    id: `desired-stat-rule-${Date.now()}-${index}`,
    type: "min",
    stat: DESIRED_STAT_OPTIONS[0]?.value ?? "luck",
    value: 0,
  };
}

function signedDeltaClass(
  value: number
): string {
  if (value > 0) {
    return "text-green-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-400";
}

interface OptimizerPageProps {
  buildState: any;

  evaluatedBuild: any;

  loading: boolean;

  optimizable: boolean;

  optimizerLocked: boolean;

  optimizerBaselineEfficiency: number;

  results: any[];

  applyBuildState: (build: any, buildHash?: string) => void;
  
  canUndoOptimizerLoad: boolean;

  undoOptimizerLoadBuild: () => void;

  selectedOptimizerBuildHash: string | null;

  setSelectedOptimizerBuildHash: (hash: string | null) => void;

  settings: OptimizerSettings;

  setSettings: (settings: OptimizerSettings) => void;

  onRefresh: () => void;

  needsRefresh: boolean;

  lockedSlots: LockedSlots;
}

export default function OptimizerPage({
  buildState,
  evaluatedBuild,
  loading,
  optimizable,
  optimizerLocked,
  optimizerBaselineEfficiency,
  results,
  applyBuildState,
  canUndoOptimizerLoad,
  undoOptimizerLoadBuild,
  selectedOptimizerBuildHash,
  setSelectedOptimizerBuildHash,
  settings,
  setSettings,
  onRefresh,
  needsRefresh,
  lockedSlots,
}: OptimizerPageProps) {
  const summary = useMemo(() => {
    const finalStatEntries = getFinalStatEntries(evaluatedBuild);

    return {
      efficiency: evaluatedBuild.efficiency,

      modifierLuck: evaluatedBuild.modifierLuck,

      modifierEfficiency: evaluatedBuild.modifierEfficiency,

      stats: evaluatedBuild.stats,

      finalStatEntries,

      cycleData: evaluatedBuild.cycleData,
    };
  }, [evaluatedBuild]);
  
  const effectiveSecondaryObjective =
    settings.secondaryObjective && canPairObjectives(settings.objective, settings.secondaryObjective)
      ? settings.secondaryObjective
      : undefined;

  const primaryObjectiveOptions =
    OPTIMIZER_OBJECTIVES.filter(
      objective =>
        objective.value !==
        effectiveSecondaryObjective
    );

  const secondaryObjectiveOptions =
    getAllowedSecondaryObjectives(settings.objective);

  const objectiveModeTitle = effectiveSecondaryObjective
    ? isMovementObjective(settings.objective)
      ? "Movement meme build"
      : "Hybrid build"
    : "Single-objective build";

  const objectiveModeDescription = effectiveSecondaryObjective
    ? isMovementObjective(settings.objective)
      ? "The optimizer will chase Walk Speed and Jump Power together. Efficiency is only a tiny tie-breaker for this meme build style."
      : "The optimizer will use both objectives to define the build style, then prefer the most efficient practical builds that match that style."
    : "The optimizer will focus on one target and use Efficiency as a practical tie-breaker when two builds are close.";
    
  const [
    expandedResultHashes,
    setExpandedResultHashes,
  ] = useState<Set<string>>(
    () => new Set()
  );
  
  const [
    resultSort,
    setResultSort,
  ] = useState<
    | "score"
    | "efficiencyGain"
    | "objectiveGain"
    | "cycleTime"
  >(
    "score"
  );

  const desiredStatRules = settings.desiredStatRules ?? [];

  function setDesiredStatRules(
    desiredStatRules: DesiredStatConstraintRule[],
  ) {
    setSettings({
      ...settings,
      desiredStatRules,
    });
  }

  function updateDesiredStatRule(
    ruleId: string,
    patch: Partial<DesiredStatConstraintRule>,
  ) {
    setDesiredStatRules(
      desiredStatRules.map((rule) =>
        rule.id === ruleId
          ? {
              ...rule,
              ...patch,
            }
          : rule,
      ),
    );
  }

  function addDesiredStatRule() {
    setDesiredStatRules([
      ...desiredStatRules,
      createDesiredStatRule(desiredStatRules.length + 1),
    ]);
  }

  function removeDesiredStatRule(ruleId: string) {
    setDesiredStatRules(
      desiredStatRules.filter((rule) => rule.id !== ruleId),
    );
  }
  
  function toggleResultExpanded(
    resultHash: string
  ) {
    setExpandedResultHashes(
      previous => {
        const next =
          new Set(previous);

        if (
          next.has(resultHash)
        ) {
          next.delete(resultHash);
        } else {
          next.add(resultHash);
        }

        return next;
      }
    );
  }
  
  const sortedResults =
    [...results].sort(
      (a, b) => {

        if (
          resultSort === "score"
        ) {
          return (
            Number(b.score ?? 0) -
            Number(a.score ?? 0)
          );
        }

        if (
          resultSort === "efficiencyGain"
        ) {
          return (
            Number(b.evaluated?.efficiency ?? 0) -
            Number(a.evaluated?.efficiency ?? 0)
          );
        }

        if (
          resultSort === "objectiveGain"
        ) {
          return (
            getObjectiveValue(
              b,
              settings.objective
            ) -
            getObjectiveValue(
              a,
              settings.objective
            )
          );
        }

        if (
          resultSort === "cycleTime"
        ) {
          const comparisonA =
            compareBuilds(
              evaluatedBuild,
              a.evaluated
            );

          const comparisonB =
            compareBuilds(
              evaluatedBuild,
              b.evaluated
            );

          return (
            comparisonA.cycleTimeDelta -
            comparisonB.cycleTimeDelta
          );
        }

        return 0;
      }
    );
    
  function isMuseumSlotLocked(
    slotId: number
  ) {
    const slotIndex =
      buildState.museumSlots.findIndex(
        (
          current: {
            slotId: number;
            mineralId: string | null;
            modifierId: string | null;
          }
        ) =>
          current.slotId === slotId
      );

    return lockedSlots.museumSlots[
      slotIndex
    ] ?? false;
  }

  return (
    <div className="space-y-4 max-w-5xl">
      <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
        <div className="space-y-2">
          <h2 className="text-xl font-semibold">Optimization Objectives</h2>

          <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm">
            <div className="font-semibold text-indigo-200">{objectiveModeTitle}</div>
            <p className="mt-1 text-xs leading-relaxed text-indigo-100/80">
              {objectiveModeDescription}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-2 font-medium">Primary Objective</label>

            <select
              className="w-full bg-slate-700 rounded-lg px-3 py-2"
              value={settings.objective}
              onChange={event => {

                const nextObjective =
                  event.target.value as OptimizerObjective;

                const nextSecondaryObjective =
                  settings.secondaryObjective && canPairObjectives(nextObjective, settings.secondaryObjective)
                    ? settings.secondaryObjective
                    : undefined;

                setSettings({
                  ...settings,

                  objective:
                    nextObjective,

                  secondaryObjective:
                    nextSecondaryObjective,
                });
              }}
            >
              {primaryObjectiveOptions.map(
                objective => (

                  <option
                    key={objective.value}
                    value={objective.value}
                  >
                    {objective.label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium">
              Secondary Objective
            </label>

            <select
              className="w-full bg-slate-700 rounded-lg px-3 py-2"
              value={effectiveSecondaryObjective ?? ""}
              onChange={event => {

                const nextSecondaryObjective =
                  (
                    event.target.value ||
                    undefined
                  ) as
                    | OptimizerObjective
                    | undefined;

                setSettings({
                  ...settings,

                  secondaryObjective:
                    nextSecondaryObjective && canPairObjectives(settings.objective, nextSecondaryObjective)
                      ? nextSecondaryObjective
                      : undefined,
                });
              }}
            >
              <option value="">None</option>

              {secondaryObjectiveOptions.map(
                objective => (

                  <option
                    key={objective.value}
                    value={objective.value}
                  >
                    {objective.label}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>


      <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-3 text-sm">
        <h2 className="text-xl font-semibold">Optimizer Constraints</h2>

        <label className="flex items-start gap-3 rounded-xl bg-slate-900/60 p-3">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 accent-indigo-500"
            checked={settings.forceOneTapBuilds}
            onChange={(event) =>
              setSettings({
                ...settings,
                forceOneTapBuilds: event.target.checked,
              })
            }
          />

          <span>
            <span className="block font-semibold text-slate-100">
              Force one-tap builds
            </span>

            <span className="mt-1 block text-xs text-slate-400">
              Only recommend builds where digs required equals 1. Other objectives and desired min/max stats still apply.
            </span>
          </span>
        </label>
      </section>

      <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Desired Min/Max Stats</h2>

            <p className="mt-1 text-xs text-slate-400">
              These constraints apply the next time the optimizer runs.
            </p>
          </div>

          <button
            type="button"
            onClick={addDesiredStatRule}
            className="rounded-lg bg-indigo-600 px-3 py-2 font-semibold text-white hover:bg-indigo-500"
          >
            + Rule
          </button>
        </div>

        <div className="space-y-3">
          {desiredStatRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-4 text-slate-400">
              No desired stat constraints added.
            </div>
          ) : (
            desiredStatRules.map((rule, index) => (
              <div
                key={rule.id}
                className="grid grid-cols-1 gap-3 rounded-xl bg-slate-900/60 p-3 md:grid-cols-[80px_minmax(90px,120px)_minmax(160px,1fr)_minmax(130px,180px)_auto] md:items-end"
              >
                <div className="font-semibold text-slate-300 md:pb-2">
                  Rule {index + 1}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Type
                  </label>

                  <select
                    className="w-full rounded-lg bg-slate-700 px-3 py-2"
                    value={rule.type}
                    onChange={(event) =>
                      updateDesiredStatRule(rule.id, {
                        type: event.target.value as DesiredStatConstraintType,
                      })
                    }
                  >
                    <option value="min">Min</option>
                    <option value="max">Max</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Stat
                  </label>

                  <select
                    className="w-full rounded-lg bg-slate-700 px-3 py-2"
                    value={rule.stat}
                    onChange={(event) =>
                      updateDesiredStatRule(rule.id, {
                        stat: event.target.value as DesiredStatConstraintStat,
                      })
                    }
                  >
                    {DESIRED_STAT_OPTIONS.map((objective) => (
                      <option
                        key={objective.value}
                        value={objective.value}
                      >
                        {objective.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    Value
                  </label>

                  <input
                    type="number"
                    inputMode="decimal"
                    min="0"
                    className="no-spinner w-full rounded-lg bg-slate-700 px-3 py-2"
                    value={Number.isFinite(Number(rule.value)) ? rule.value : 0}
                    onChange={(event) =>
                      updateDesiredStatRule(rule.id, {
                        value: Number.isFinite(Number(event.target.value))
                          ? Number(event.target.value)
                          : 0,
                      })
                    }
                  />
                </div>

                <button
                  type="button"
                  onClick={() => removeDesiredStatRule(rule.id)}
                  className="rounded-lg bg-slate-700 px-3 py-2 font-semibold text-slate-200 hover:bg-slate-600"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-xl font-semibold mb-4">Current Evaluated Build</h3>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Efficiency</span>

            <span className="font-bold text-indigo-300">
              {summary.efficiency.toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span>Modifier Efficiency</span>

            <span className="font-bold text-indigo-300">
              {summary.modifierEfficiency.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-slate-700 pt-3 mt-3">
            <div className="font-semibold mb-2">Final Stats</div>

            <div className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-2">
              {summary.finalStatEntries.map(({ key, label, value }) => (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="truncate text-slate-300">{label}</span>

                  <span className="font-medium tabular-nums text-slate-100">
                    {value.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-xl font-semibold">Optimizer Results</h2>

          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
            {canUndoOptimizerLoad && (
              <button
                type="button"
                onClick={undoOptimizerLoadBuild}
                disabled={loading}
                className={
                  loading
                    ? "rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                    : "rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold hover:bg-amber-600"
                }
              >
                Undo Load Build
              </button>
            )}

            <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-300 sm:flex-none">
              <span className="shrink-0">Sort by:</span>
              <select
                className="min-w-0 flex-1 rounded-lg bg-slate-700 px-3 py-2 text-sm sm:w-56 sm:flex-none"
                value={resultSort}
                onChange={event =>
                  setResultSort(
                    event.target.value as
                      | "score"
                      | "efficiencyGain"
                      | "objectiveGain"
                      | "cycleTime"
                  )
                }
              >
                <option value="score">Recommended</option>

                <option value="efficiencyGain">Efficiency Gain</option>

                <option value="objectiveGain">Objective Gain</option>

                <option value="cycleTime">Cycle Time Δ</option>
              </select>
            </label>

            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              title={loading ? "Optimizer is running" : "Run Optimizer"}
              aria-label={loading ? "Optimizer is running" : "Run Optimizer"}
              className={
                loading
                  ? "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-500 cursor-not-allowed"
                  : `inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold hover:bg-indigo-500 ${
                      needsRefresh ? "attention-glow" : ""
                    }`
              }
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Run Optimizer
            </button>
          </div>
        </div>

        {loading && <LoadingProgressBar />}

        {!loading && results.length === 0 && (
          <div className="text-slate-400">No optimizer results yet.</div>
        )}

        <div className="space-y-3">
          {sortedResults.map((result, index) => {
            const resultHash = JSON.stringify(result.build);
            
            const expanded = expandedResultHashes.has(resultHash);

            const resultFinalStatEntries = getFinalStatEntries(result.evaluated);
            const optimizedScoreEntries = [
              {
                key: "efficiency",
                label: "Efficiency",
                value: Number(result.evaluated.efficiency ?? 0),
              },
              {
                key: "modifierEfficiency",
                label: "Modifier Efficiency",
                value: Number(result.evaluated.modifierEfficiency ?? 0),
              },
            ];

            const selected = resultHash === selectedOptimizerBuildHash;

            const comparison = compareBuilds(evaluatedBuild, result.evaluated);

            const changedSlots = getChangedSlots(buildState, result.build);

            const resultEfficiency =
              Number(result.evaluated?.efficiency ?? 0);

            const efficiencyDelta =
              resultEfficiency - optimizerBaselineEfficiency;

            const efficiencyDeltaPercent =
              (
                efficiencyDelta /
                Math.max(optimizerBaselineEfficiency, 1)
              ) * 100;

            const baselineObjectiveValue =
              getObjectiveValue(
                {
                  evaluated: evaluatedBuild,
                },
                settings.objective,
              );

            const resultObjectiveValue =
              getObjectiveValue(
                result,
                settings.objective,
              );

            const objectiveDelta =
              resultObjectiveValue - baselineObjectiveValue;

            const objectiveLabel =
              getObjectiveLabel(settings.objective);

            const resultMuseumColumnOne =
              (result.build.museumSlots as MuseumSlotSelection[])
                .filter((slot: MuseumSlotSelection) => slot.slotId <= 9)
                .sort(
                  (a: MuseumSlotSelection, b: MuseumSlotSelection) =>
                    a.slotId - b.slotId,
                );

            const resultMuseumColumnTwo =
              (result.build.museumSlots as MuseumSlotSelection[])
                .filter((slot: MuseumSlotSelection) => slot.slotId >= 10)
                .sort(
                  (a: MuseumSlotSelection, b: MuseumSlotSelection) =>
                    a.slotId - b.slotId,
                );

            const visibleChangedSlots = changedSlots.slice(0, 8);

            const hiddenChangedSlotCount = Math.max(
              changedSlots.length - visibleChangedSlots.length,
              0,
            );

            const statDiffEntries = Object.entries(comparison.statDiffs)
              .filter(([, value]) => value !== 0);

            return (
              <div
                key={index}
                className={`rounded-xl p-4 w-full text-left transition-colors ${
                  selected ? "bg-indigo-700" : "bg-slate-700"
                }`}
              >
                <div className="flex justify-between gap-4 items-start">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-slate-400 mb-1">
                      Rank #{index + 1}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,480px)] gap-3 items-start">
                      <div className="min-w-0">
                        {result.candidate?.slot !== "fullBuild" && result.candidate?.label}
                        <div className="mt-2 min-h-[48px] flex flex-wrap content-start gap-1">

                          {changedSlots.length > 0 ? (
                            <>
                              {visibleChangedSlots.map(
                                slot => (

                                  <span
                                    key={slot}
                                    className="bg-emerald-900/50 text-emerald-300 rounded px-2 py-0.5 text-[10px] font-semibold"
                                  >
                                    {slot}
                                  </span>
                                )
                              )}

                              {hiddenChangedSlotCount > 0 && (
                                <span className="bg-emerald-900/50 text-emerald-300 rounded px-2 py-0.5 text-[10px] font-semibold">
                                  +{hiddenChangedSlotCount} more
                                </span>
                              )}
                            </>
                          ) : (

                            <span className="bg-slate-800 text-slate-400 rounded px-2 py-0.5 text-[10px]">
                              No slot changes
                            </span>
                          )}

                        </div>
                      </div>

                      <div className="text-xs text-slate-500 w-full">
                        <div className="grid grid-cols-2 gap-2 text-xs w-full">
                          {statDiffEntries.length > 0 ? (
                            statDiffEntries.map(([stat, value]) => (
                              <div
                                key={stat}
                                className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 bg-slate-800 rounded px-2 py-1"
                              >
                                <span className="truncate">{stat}</span>

                                <span
                                  className={
                                    value > 0
                                      ? "text-green-400"
                                      : "text-red-400"
                                  }
                                >
                                  {value > 0 ? "+" : ""}

                                  {value.toFixed(2)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div className="col-span-2 bg-slate-800 rounded px-2 py-1 text-slate-400">
                              No stat changes
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 w-[220px]">
                      <div className="font-bold text-indigo-300">
                        Efficiency: {resultEfficiency.toFixed(2)}
                      </div>

                      <div className={`text-xs ${signedDeltaClass(efficiencyDeltaPercent)}`}>
                        {formatSignedNumber(efficiencyDeltaPercent)}%
                      </div>

                      <div className="text-xs text-slate-400 mt-2">
                        Objective Score: {resultObjectiveValue.toFixed(2)}
                      </div>

                      <div className={`text-xs ${signedDeltaClass(objectiveDelta)}`}>
                        Objective Δ: {formatSignedNumber(objectiveDelta)}
                      </div>

                      <div className="text-xs text-slate-400 mt-2">
                        Cycle Time Δ: {formatSignedNumber(comparison.cycleTimeDelta)}
                      </div>
                      <div className="mt-3 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => applyBuildState(result.build, resultHash)}
                          className="mt-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                          Load Build
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            toggleResultExpanded(
                              resultHash
                            )
                          }
                          className="mt-3 ml-2 bg-slate-600 hover:bg-slate-500 rounded-lg px-3 py-1.5 text-xs font-semibold"
                        >
                          {expanded
                            ? "Hide Details"
                            : "Show Details"}
                        </button>    
                    </div>                                    
                  </div>
                </div>
                {expanded && (
                  <div className="mt-4 bg-slate-900 rounded-xl p-3 text-xs space-y-2">
                    <div className="font-semibold text-slate-300">
                      Resulting Build
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div
                        className={buildRowClass(
                          isDifferent(buildState.panId, result.build.panId) ||
                            isDifferent(
                              buildState.panEnchantId,
                              result.build.panEnchantId,
                            ),
                        )}
                      >
                        <span className="text-slate-400">
                          {lockBadge(lockedSlots.pan)}Pan:
                        </span>{" "}
                        {formatName(result.build.panEnchantId, enchants)}
                        {" "}
                        {formatName(result.build.panId, pans)}
                      </div>

                      <div
                        className={buildRowClass(
                          isDifferent(buildState.shovelId, result.build.shovelId),
                        )}
                      >
                        <span className="text-slate-400">
                          {lockBadge(lockedSlots.shovel)}Shovel:
                        </span>{" "}
                        {formatName(result.build.shovelId, shovels)}
                      </div>

                      <div
                        className={buildRowClass(
                          isDifferent(
                            buildState.necklaceId,
                            result.build.necklaceId,
                          ) ||
                            isDifferent(
                              buildState.necklaceMutationId,
                              result.build.necklaceMutationId,
                            ),
                        )}
                      >
                        <span className="text-slate-400">
                          {lockBadge(lockedSlots.necklace)}Necklace:
                        </span>{" "}
                        {formatName(result.build.necklaceMutationId, mutations)}
                        {" "}
                        {formatName(result.build.necklaceId, necklaces)}
                      </div>

                      <div
                        className={buildRowClass(
                          isDifferent(buildState.charmId, result.build.charmId) ||
                            isDifferent(
                              buildState.charmMutationId,
                              result.build.charmMutationId,
                            ),
                        )}
                      >
                        <span className="text-slate-400">
                          {lockBadge(lockedSlots.charm)}Charm:
                        </span>{" "}
                        {formatName(result.build.charmMutationId, mutations)}
                        {" "}
                        {formatName(result.build.charmId, charms)}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700 space-y-1">
                      <div className="font-semibold text-slate-300">Rings</div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        {result.build.rings.map(
                          (
                            ring: {
                              ringId: string | null;
                              mutationId: string | null;
                            },
                            ringIndex: number,
                          ) => (
                            <div
                              key={ringIndex}
                              className={buildRowClass(
                                isDifferent(
                                  buildState.rings[ringIndex]?.ringId,
                                  ring.ringId,
                                ) ||
                                  isDifferent(
                                    buildState.rings[ringIndex]?.mutationId,
                                    ring.mutationId,
                                  ),
                              )}
                            >
                              <span className="text-slate-400">
                                {lockBadge(lockedSlots.rings[ringIndex] ?? false)}
                                Ring {ringIndex + 1}:
                              </span>{" "}
                              {formatName(ring.mutationId, mutations)}
                              {" "}
                              {formatName(ring.ringId, rings)}
                            </div>
                          ),
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700 space-y-1">
                      <div className="font-semibold text-slate-300">
                        {lockBadge(buildState.museumSlots.every((slot: MuseumSlotSelection) =>
                          isMuseumSlotLocked(slot.slotId),
                        ))}Museum
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                        <div className="space-y-1">
                          {resultMuseumColumnOne.map((slot: MuseumSlotSelection) => {
                            const currentSlot = buildState.museumSlots.find(
                              (current: MuseumSlotSelection) =>
                                current.slotId === slot.slotId,
                            );

                            return (
                              <div
                                key={slot.slotId}
                                className={buildRowClass(
                                  museumSlotChanged(currentSlot, slot),
                                )}
                              >
                                <span className="text-slate-400">
                                  {lockBadge(
                                    isMuseumSlotLocked(slot.slotId)
                                  )}
                                  Slot {slot.slotId}:
                                </span>
                                {" "}
                                {formatName(slot.modifierId, museumModifiers)}
                                {" "}
                                {formatName(slot.mineralId, museumMinerals)}
                              </div>
                            );
                          })}
                        </div>

                        <div className="space-y-1">
                          {resultMuseumColumnTwo.map((slot: MuseumSlotSelection) => {
                            const currentSlot = buildState.museumSlots.find(
                              (current: MuseumSlotSelection) =>
                                current.slotId === slot.slotId,
                            );

                            return (
                              <div
                                key={slot.slotId}
                                className={buildRowClass(
                                  museumSlotChanged(currentSlot, slot),
                                )}
                              >
                                <span className="text-slate-400">
                                  {lockBadge(
                                    isMuseumSlotLocked(slot.slotId)
                                  )}
                                  Slot {slot.slotId}:
                                </span>
                                {" "}
                                {formatName(slot.modifierId, museumModifiers)}
                                {" "}
                                {formatName(slot.mineralId, museumMinerals)}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-700 space-y-2">
                      <div className="font-semibold text-slate-300">
                        Optimized Final Stats
                      </div>

                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        {optimizedScoreEntries.map((entry) => (
                          <div
                            key={entry.key}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 rounded-lg bg-slate-800 px-2 py-1"
                          >
                            <span className="truncate text-slate-300">
                              {entry.label}
                            </span>

                            <span className="font-semibold tabular-nums text-indigo-300">
                              {entry.value.toFixed(2)}
                            </span>
                          </div>
                        ))}

                        {resultFinalStatEntries.map(({ key, label, value }) => (
                          <div
                            key={key}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-2 rounded-lg bg-slate-800 px-2 py-1"
                          >
                            <span className="truncate text-slate-300">
                              {label}
                            </span>

                            <span className="font-medium tabular-nums text-slate-100">
                              {value.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
