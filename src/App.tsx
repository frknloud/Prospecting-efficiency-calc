import { useEffect, useMemo, useRef, useState } from "react";

import museumSlotsData from "./data/museum-slots.json";
import rawPans from "./data/pans.json";
import rawShovels from "./data/shovels.json";
import rawNecklaces from "./data/necklaces.json";
import rawCharms from "./data/charms.json";
import mutations from "./data/mutations.json";
import enchants from "./data/enchants.json";

import MuseumSlotSelector from "./components/MuseumSlotSelector";
import EquipmentPanel from "./components/EquipmentPanel";
import StatBadge from "./components/StatBadge";

import CalculatorTab from "./pages/CalculatorTab";
import BreakdownTab from "./pages/BreakdownTab";
import UpgradesTab from "./pages/UpgradesTab";
import OptimizerPage from "./pages/OptimizerPage";
import OptimizerSettingsPage from "./pages/OptimizerSettingsPage";
import InstructionsTab from "./pages/InstructionsTab";

import { isBuildOptimizable } from "./optimizer/isBuildOptimizable";

import { recommendUpgrades } from "./engine/recommendUpgrades";
import type { UpgradeRecommendation } from "./engine/recommendUpgrades";
import { isBuildReadyForRecommendations } from "./helpers/isBuildReadyForRecommendations";
import { FIXED_CYCLE_TIME } from "./engine/core/constants";
import { createBuildState } from "./engine/createBuildState";
import { normalizeBuildState } from "./engine/normalizeBuildState";

import { useEvaluatedBuild } from "./hooks/useEvaluatedBuild";
import { stripTemporaryEffectsForOptimization } from "./engine/stripTemporaryEffectsForOptimization";
import { useOptimizer } from "./hooks/useOptimizer";
import { useAppUpdateCheck } from "./hooks/useAppUpdateCheck";

import type { BuildState, MuseumSlotSelection, Rarity, EquipmentItem, } from "./engine/types";
import type { OptimizerSettings, DesiredStatConstraintRule } from "./optimizer/optimizerSettings";
import type { LockedSlots, } from "./optimizer/types";
import type { AccessSettings, } from "./access/accessTypes";

import { loadOptimizerSettings, saveOptimizerSettings, } from "./optimizer/optimizerSettings";
import { respectsLockedSlots, } from "./optimizer/respectsLockedSlots";
import { scoreBuild, } from "./optimizer/scoreBuild";
import { canPairObjectives } from "./optimizer/objectiveRules";
import { OPTIMIZER_MAX_REQUEST_TIMEOUT_MS, OPTIMIZER_MIN_REQUEST_TIMEOUT_MS, } from "./optimizer/optimizerConfig";

import { DEFAULT_ACCESS_SETTINGS, isRegionUnlocked, } from "./access/accessRules";
import {
  createDefaultPermanentBuffs,
  REGION_LOCKED_PERMANENT_BUFFS,
  sanitizePermanentBuffsForAccess,
} from "./components/PermanentBuffsPanel";
import type { PermanentBuffsState } from "./components/PermanentBuffsPanel";
import type { ConsumablesState } from "./components/ConsumablesPanel";

const STORAGE_KEY = "prospecting-build-v5";
const ACTIVE_TAB_STORAGE_KEY = "prospecting-active-tab-v1";
const RING_SLOT_COUNT = 8;

type AppTab =
  | "instructions"
  | "calculator"
  | "breakdown"
  | "upgrades"
  | "optimizer"
  | "settings";

function loadSavedActiveTab(): AppTab {
  if (typeof window === "undefined") {
    return "instructions";
  }

  const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) as AppTab | null;

  if (
    savedTab === "instructions" ||
    savedTab === "calculator" ||
    savedTab === "breakdown" ||
    savedTab === "upgrades" ||
    savedTab === "optimizer" ||
    savedTab === "settings"
  ) {
    return savedTab;
  }

  return "instructions";
}


const createDefaultMuseumSlots = (): MuseumSlotSelection[] =>
  museumSlotsData.map((slot) => ({
    slotId: slot.slotId,
    rarity: slot.rarity as Rarity,
    mineralId: null,
    modifierId: null,
  }));

const createDefaultLockedSlots = (): LockedSlots => ({
  pan: false,
  shovel: false,
  necklace: false,
  charm: false,
  museum: false,
  museumSlots: Array(museumSlotsData.length).fill(false),
  rings: Array(RING_SLOT_COUNT).fill(false),
});

function normalizeLockedSlots(savedLockedSlots?: Partial<LockedSlots>): LockedSlots {
  const defaults = createDefaultLockedSlots();

  if (!savedLockedSlots) {
    return defaults;
  }

  const savedMuseumSlots = Array.isArray(savedLockedSlots.museumSlots)
    ? savedLockedSlots.museumSlots
    : [];

  return {
    ...defaults,
    ...savedLockedSlots,
    museum: false,
    museumSlots: savedLockedSlots.museum
      ? Array(museumSlotsData.length).fill(true)
      : Array.from(
          { length: museumSlotsData.length },
          (_, index) => savedMuseumSlots[index] ?? false,
        ),
    rings: Array.from(
      { length: RING_SLOT_COUNT },
      (_, index) => savedLockedSlots.rings?.[index] ?? false,
    ),
  };
}

function buildDesiredStatConstraints(
  rules: DesiredStatConstraintRule[],
): {
  minStats?: Partial<Record<string, number>>;
  maxStats?: Partial<Record<string, number>>;
} {
  const minStats: Partial<Record<string, number>> = {};

  const maxStats: Partial<Record<string, number>> = {};

  for (const rule of rules) {
    const value = Number(rule.value);

    if (!rule.stat || !Number.isFinite(value)) {
      continue;
    }

    if (rule.type === "min") {
      minStats[rule.stat] = Math.max(Number(minStats[rule.stat] ?? value), value);
    } else {
      maxStats[rule.stat] = Math.min(Number(maxStats[rule.stat] ?? value), value);
    }
  }

  return {
    minStats: Object.keys(minStats).length > 0 ? minStats : undefined,
    maxStats: Object.keys(maxStats).length > 0 ? maxStats : undefined,
  };
}

function calculateOptimizerTimeoutMs(
  lockedSlots: LockedSlots,
  ringSlotLimit: number,
  museumSlotCount: number,
): number {
  const totalOptimizableSlots = 4 + ringSlotLimit + museumSlotCount;

  if (totalOptimizableSlots <= 0) {
    return OPTIMIZER_MIN_REQUEST_TIMEOUT_MS;
  }

  const lockedEquipmentSlots = [
    lockedSlots.pan,
    lockedSlots.shovel,
    lockedSlots.necklace,
    lockedSlots.charm,
  ].filter(Boolean).length;

  const lockedRingSlots = lockedSlots.rings
    .slice(0, ringSlotLimit)
    .filter(Boolean).length;

  const lockedMuseumSlots = lockedSlots.museumSlots
    .slice(0, museumSlotCount)
    .filter(Boolean).length;

  const lockedCount = Math.min(
    totalOptimizableSlots,
    lockedEquipmentSlots + lockedRingSlots + lockedMuseumSlots,
  );

  const unlockedRatio =
    (totalOptimizableSlots - lockedCount) / totalOptimizableSlots;

  return Math.round(
    OPTIMIZER_MIN_REQUEST_TIMEOUT_MS +
      (OPTIMIZER_MAX_REQUEST_TIMEOUT_MS - OPTIMIZER_MIN_REQUEST_TIMEOUT_MS) *
        unlockedRatio,
  );
}


const pans: EquipmentItem[] = rawPans;
const shovels: EquipmentItem[] = rawShovels;
const necklaces: EquipmentItem[] = rawNecklaces;
const charms: EquipmentItem[] = rawCharms;

function loadSavedBuild() {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const savedBuild = useMemo(() => loadSavedBuild(), []);
  const { updateAvailable, refreshApp } = useAppUpdateCheck();

  const initialAccessSettings: AccessSettings = {
    ...DEFAULT_ACCESS_SETTINGS,
    ...(savedBuild?.accessSettings ?? {}),
    specialAccess: {
      ...DEFAULT_ACCESS_SETTINGS.specialAccess,
      ...(savedBuild?.accessSettings?.specialAccess ?? {}),
    },
  };

  const [ringSlotLimit, setRingSlotLimit] = useState<6 | 8>(
    savedBuild?.ringSlotLimit ?? 8,
  );

  const [selectedPan, setSelectedPan] = useState<string | null>(
    savedBuild?.selectedPan ?? null,
  );

  const [selectedPanEnchant, setSelectedPanEnchant] = useState<string | null>(
    savedBuild?.selectedPanEnchant ?? null,
  );

  const [selectedShovel, setSelectedShovel] = useState<string | null>(
    savedBuild?.selectedShovel ?? null,
  );

  const [selectedNecklace, setSelectedNecklace] = useState<string | null>(
    savedBuild?.selectedNecklace ?? null,
  );

  const [selectedNecklaceMutation, setSelectedNecklaceMutation] = useState<
    string | null
  >(savedBuild?.selectedNecklaceMutation ?? null);

  const [selectedCharm, setSelectedCharm] = useState<string | null>(
    savedBuild?.selectedCharm ?? null,
  );

  const [selectedCharmMutation, setSelectedCharmMutation] = useState<
    string | null
  >(savedBuild?.selectedCharmMutation ?? null);

  const [permanentBuffs, setPermanentBuffs] = useState<PermanentBuffsState>(
    sanitizePermanentBuffsForAccess(
      {
        ...createDefaultPermanentBuffs(initialAccessSettings),
        ...(savedBuild?.permanentBuffs ?? {}),
      },
      initialAccessSettings,
    ),
  );

  const [selectedConsumables, setSelectedConsumables] =
    useState<ConsumablesState>(
      savedBuild?.selectedConsumables ?? {
        boostRelics: [],
        potions: [],
      },
    );

  const [selectedRings, setSelectedRings] = useState<Array<string | null>>(
    savedBuild?.selectedRings ?? Array(RING_SLOT_COUNT).fill(null),
  );

  const [selectedRingMutations, setSelectedRingMutations] = useState<
    Array<string | null>
  >(savedBuild?.selectedRingMutations ?? Array(RING_SLOT_COUNT).fill(null));


  const [museumSlots, setMuseumSlots] = useState<MuseumSlotSelection[]>(
    savedBuild?.museumSlots ?? createDefaultMuseumSlots(),
  );

  const [activeTab, setActiveTab] = useState<AppTab>(() =>
    loadSavedActiveTab(),
  );

  const [
    lockedSlots,
    setLockedSlots,
  ] = useState<LockedSlots>(() =>
    normalizeLockedSlots(savedBuild?.lockedSlots),
  );

  const [optimizerSettings, setOptimizerSettings] = useState<OptimizerSettings>(
    loadOptimizerSettings(),
  );

  const [accessSettings, setAccessSettings] =
    useState<AccessSettings>(initialAccessSettings);

  const previousAccessRegionRef = useRef(accessSettings.region);

  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ringSlotLimit,
        selectedPan,
        selectedPanEnchant,
        selectedShovel,
        selectedNecklace,
        selectedNecklaceMutation,
        selectedCharm,
        selectedCharmMutation,
        permanentBuffs,
        selectedConsumables,
        selectedRings,
        selectedRingMutations,
        museumSlots,
        lockedSlots,
        accessSettings,
      }),
    );
  }, [
    ringSlotLimit,
    selectedPan,
    selectedPanEnchant,
    selectedShovel,
    selectedNecklace,
    selectedNecklaceMutation,
    selectedCharm,
    selectedCharmMutation,
    permanentBuffs,
    selectedConsumables,
    selectedRings,
    selectedRingMutations,
    museumSlots,
    lockedSlots,
    accessSettings,
  ]);

  useEffect(() => {
    saveOptimizerSettings(optimizerSettings);
  }, [optimizerSettings]);

  useEffect(() => {
    setPermanentBuffs((previous) => {
      const next = sanitizePermanentBuffsForAccess(
        previous,
        accessSettings,
      );

      for (const buff of REGION_LOCKED_PERMANENT_BUFFS) {
        const wasAccessible = isRegionUnlocked(
          buff.requiredRegion,
          previousAccessRegionRef.current,
        );

        const isAccessible = isRegionUnlocked(
          buff.requiredRegion,
          accessSettings.region,
        );

        if (!wasAccessible && isAccessible) {
          next[buff.id] = true;
        }
      }

      return next;
    });

    previousAccessRegionRef.current = accessSettings.region;
  }, [accessSettings]);

  const museumColumnOne = museumSlots.filter((slot) => slot.slotId <= 9);
  const museumColumnTwo = museumSlots.filter((slot) => slot.slotId >= 10);


  const buildState = useMemo(
    () =>
      createBuildState({
        selectedPan,
        selectedPanEnchant,

        selectedShovel,

        selectedNecklace,
        selectedNecklaceMutation,

        selectedCharm,
        selectedCharmMutation,

        selectedRings,
        selectedRingMutations,

        permanentBuffs,
        selectedConsumables,

        museumSlots,
      }),
    [
      selectedPan,
      selectedPanEnchant,
      selectedShovel,
      selectedNecklace,
      selectedNecklaceMutation,
      selectedCharm,
      selectedCharmMutation,
      selectedRings,
      selectedRingMutations,
      permanentBuffs,
      selectedConsumables,
      museumSlots,
    ],
  );

  const normalizedBuildState = useMemo(
    () => normalizeBuildState(buildState, ringSlotLimit),
    [buildState, ringSlotLimit],
  );

  const optimizationBuildState = useMemo(
    () => stripTemporaryEffectsForOptimization(normalizedBuildState),
    [normalizedBuildState],
  );

  const evaluatedBuild = useEvaluatedBuild(normalizedBuildState);

  const optimizerEvaluatedBuild = useEvaluatedBuild(optimizationBuildState);

  const {
    runOptimizer,
    clearResults: clearOptimizerResults,
    results: optimizerResults,
    loading: optimizerLoading,
  } = useOptimizer();

  const optimizable = isBuildOptimizable(normalizedBuildState);

  const buildHash = useMemo(
    () => JSON.stringify(normalizedBuildState),
    [normalizedBuildState],
  );

  const desiredStatConstraints = useMemo(
    () => buildDesiredStatConstraints(optimizerSettings.desiredStatRules),
    [optimizerSettings.desiredStatRules],
  );

  const effectiveOptimizerSecondaryObjective = useMemo(
    () =>
      optimizerSettings.secondaryObjective &&
      canPairObjectives(optimizerSettings.objective, optimizerSettings.secondaryObjective)
        ? optimizerSettings.secondaryObjective
        : undefined,
    [optimizerSettings.objective, optimizerSettings.secondaryObjective],
  );

  const optimizerRequestTimeoutMs = useMemo(
    () =>
      calculateOptimizerTimeoutMs(
        lockedSlots,
        ringSlotLimit,
        normalizedBuildState.museumSlots.length,
      ),
    [lockedSlots, ringSlotLimit, normalizedBuildState.museumSlots.length],
  );

  const optimizerCacheKey = useMemo(
    () =>
      JSON.stringify({
        build: optimizationBuildState,

        lockedSlots,

        accessSettings,

        objective: optimizerSettings.objective,

        secondaryObjective: effectiveOptimizerSecondaryObjective,

        mode: optimizerSettings.mode,

        strategy: optimizerSettings.strategy,

        topResults: optimizerSettings.topResults,

        desiredStatRules: optimizerSettings.desiredStatRules,

        forceOneTapBuilds: optimizerSettings.forceOneTapBuilds,
      }),
    [
      optimizationBuildState,
      lockedSlots,
      accessSettings,
      optimizerSettings.objective,
      effectiveOptimizerSecondaryObjective,
      optimizerSettings.mode,
      optimizerSettings.strategy,
      optimizerSettings.topResults,
      optimizerSettings.desiredStatRules,
      optimizerSettings.forceOneTapBuilds,
    ],
  );

  const upgradeAdvisorInputKey = useMemo(
    () =>
      JSON.stringify({
        build: optimizationBuildState,
        ringSlotLimit,
        accessSettings,
      }),
    [optimizationBuildState, ringSlotLimit, accessSettings],
  );

  const [lastUpgradeAdvisorInputKey, setLastUpgradeAdvisorInputKey] =
    useState<string | null>(null);

  const [lastOptimizerRunKey, setLastOptimizerRunKey] = useState<string | null>(
    null,
  );

  const upgradeAdvisorNeedsRefresh =
    lastUpgradeAdvisorInputKey !== null &&
    lastUpgradeAdvisorInputKey !== upgradeAdvisorInputKey;

  const optimizerNeedsRefresh =
    lastOptimizerRunKey !== null && lastOptimizerRunKey !== optimizerCacheKey;

  const [selectedOptimizerBuildHash, setSelectedOptimizerBuildHash] = useState<
    string | null
  >(null);
  
  const [undoOptimizerBuild, setUndoOptimizerBuild] =
    useState<BuildState | null>(null);

  const [optimizerLocked, setOptimizerLocked] = useState(false);

  const [optimizerBaselineEfficiency, setOptimizerBaselineEfficiency] =
    useState(0);

  const optimizerTimeoutRef = useRef<number | null>(null);

  async function runCurrentOptimizer() {
    if (!optimizable) {
      return;
    }

    setOptimizerBaselineEfficiency(optimizerEvaluatedBuild.efficiency);

    try {
      await runOptimizer(
        optimizerCacheKey,
        optimizationBuildState,
        ringSlotLimit,
        {
          objective: optimizerSettings.objective,

          secondaryObjective: effectiveOptimizerSecondaryObjective,

          baselineEfficiency: optimizerEvaluatedBuild.efficiency,

          baselineScore: scoreBuild(
            optimizerEvaluatedBuild,
            {
              objective: optimizerSettings.objective,

              secondaryObjective: effectiveOptimizerSecondaryObjective,
            },
          ),

          mode: optimizerSettings.mode,

          strategy: optimizerSettings.strategy,

          topResults: optimizerSettings.topResults,

          minStats: desiredStatConstraints.minStats,

          maxStats: desiredStatConstraints.maxStats,

          forceOneTapBuilds: optimizerSettings.forceOneTapBuilds,

          lockedSlots,

          accessSettings,

          searchTimeBudgetMs: Math.max(5_000, optimizerRequestTimeoutMs - 10_000),
        },
        (result) =>
          respectsLockedSlots(
            optimizationBuildState,
            result.build,
            lockedSlots,
          ),
        optimizerRequestTimeoutMs,
      );
    } catch (error) {
      console.error("Optimizer failed", error);
    }
  }

  useEffect(() => {
    if (!optimizerSettings.autoRun || !optimizable || optimizerLocked) {
      return;
    }

    if (optimizerTimeoutRef.current) {
      clearTimeout(optimizerTimeoutRef.current);
    }

    optimizerTimeoutRef.current = window.setTimeout(() => {
      void runCurrentOptimizer();
    }, optimizerSettings.debounceMs);

    return () => {
      if (optimizerTimeoutRef.current) {
        clearTimeout(optimizerTimeoutRef.current);
      }
    };
  }, [
    optimizerCacheKey,
    ringSlotLimit,
    optimizable,
    optimizerLocked,
    optimizerEvaluatedBuild.efficiency,
    optimizerSettings.autoRun,
    optimizerSettings.objective,
    effectiveOptimizerSecondaryObjective,
    optimizerSettings.mode,
    optimizerSettings.strategy,
    optimizerSettings.topResults,
    optimizerSettings.desiredStatRules,
    optimizerSettings.forceOneTapBuilds,
    optimizerSettings.debounceMs,
    optimizerRequestTimeoutMs,
    optimizationBuildState,
    lockedSlots,
    accessSettings,
  ]);

  const canRunUpgradeAdvisor = isBuildReadyForRecommendations(normalizedBuildState);

  const [upgradeRecommendations, setUpgradeRecommendations] = useState<
    UpgradeRecommendation[]
  >([]);

  const [upgradeAdvisorLoading, setUpgradeAdvisorLoading] = useState(false);

  function runUpgradeAdvisor() {
    if (!canRunUpgradeAdvisor || upgradeAdvisorLoading) {
      return;
    }

    setUpgradeRecommendations([]);
    setUpgradeAdvisorLoading(true);

    window.setTimeout(() => {
      try {
        setUpgradeRecommendations(
          recommendUpgrades(
            optimizationBuildState,
            ringSlotLimit,
            accessSettings,
          ),
        );

        setLastUpgradeAdvisorInputKey(upgradeAdvisorInputKey);
      } catch (error) {
        console.error("Upgrade Advisor failed", error);
        setUpgradeRecommendations([]);
      } finally {
        setUpgradeAdvisorLoading(false);
      }
    }, 0);
  }

  function applyBuildState(build: BuildState, buildHash?: string) {
    setUndoOptimizerBuild(normalizedBuildState);

    setSelectedPan(build.panId);

    setSelectedPanEnchant(build.panEnchantId);

    setSelectedShovel(build.shovelId);

    setSelectedNecklace(build.necklaceId);

    setSelectedNecklaceMutation(build.necklaceMutationId);

    setSelectedCharm(build.charmId);

    setSelectedCharmMutation(build.charmMutationId);

    setSelectedRings((previousRings) =>
      Array.from(
        { length: RING_SLOT_COUNT },
        (_, index) =>
          index < ringSlotLimit
            ? build.rings[index]?.ringId ?? null
            : previousRings[index] ?? null,
      ),
    );

    setSelectedRingMutations((previousMutations) =>
      Array.from(
        { length: RING_SLOT_COUNT },
        (_, index) =>
          index < ringSlotLimit
            ? build.rings[index]?.mutationId ?? null
            : previousMutations[index] ?? null,
      ),
    );

    setMuseumSlots(build.museumSlots);

    if (buildHash) {
      setSelectedOptimizerBuildHash(buildHash);
    }

    setOptimizerLocked(true);
    window.setTimeout(() => {
      setOptimizerLocked(false);
    }, 1500);
  }

  function undoOptimizerLoadBuild() {
    if (!undoOptimizerBuild) {
      return;
    }

    const buildToRestore = undoOptimizerBuild;

    setUndoOptimizerBuild(null);

    setSelectedPan(buildToRestore.panId);

    setSelectedPanEnchant(buildToRestore.panEnchantId);

    setSelectedShovel(buildToRestore.shovelId);

    setSelectedNecklace(buildToRestore.necklaceId);

    setSelectedNecklaceMutation(buildToRestore.necklaceMutationId);

    setSelectedCharm(buildToRestore.charmId);

    setSelectedCharmMutation(buildToRestore.charmMutationId);

    setSelectedRings((previousRings) =>
      Array.from(
        { length: RING_SLOT_COUNT },
        (_, index) =>
          index < ringSlotLimit
            ? buildToRestore.rings[index]?.ringId ?? null
            : previousRings[index] ?? null,
      ),
    );

    setSelectedRingMutations((previousMutations) =>
      Array.from(
        { length: RING_SLOT_COUNT },
        (_, index) =>
          index < ringSlotLimit
            ? buildToRestore.rings[index]?.mutationId ?? null
            : previousMutations[index] ?? null,
      ),
    );

    setMuseumSlots(buildToRestore.museumSlots);

    setSelectedOptimizerBuildHash(null);

    setOptimizerLocked(true);

    window.setTimeout(() => {
      setOptimizerLocked(false);
    }, 1500);
  }

  function updateMuseumSlot(updated: MuseumSlotSelection) {
    setMuseumSlots((prev) =>
      prev.map((slot) => (slot.slotId === updated.slotId ? updated : slot)),
    );
  }

  function updateRing(index: number, value: string | null) {
    setSelectedRings((prev) =>
      prev.map((ring, ringIndex) => (ringIndex === index ? value : ring)),
    );
  }

  function updateRingMutation(index: number, value: string | null) {
    setSelectedRingMutations((prev) =>
      prev.map((mutation, mutationIndex) =>
        mutationIndex === index ? value : mutation,
      ),
    );
  }

  function toggleConsumable(
    category: keyof ConsumablesState,
    consumableId: string,
  ) {
    setSelectedConsumables((previous) => {
      const currentCategory = previous[category];

      return {
        ...previous,
        [category]: currentCategory.includes(consumableId)
          ? currentCategory.filter((id) => id !== consumableId)
          : [...currentCategory, consumableId],
      };
    });
  }


  function refreshOptimizerResults() {
    clearOptimizerResults();
    setLastOptimizerRunKey(optimizerCacheKey);
    void runCurrentOptimizer();
  }

  return (
    <main className="min-h-screen p-4 bg-slate-900 text-white overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-4">
          <h1 className="text-3xl font-bold">
            Prospecting Efficiency Calculator
          </h1>

          {updateAvailable && (
            <div className="rounded-2xl border border-blue-400/50 bg-blue-500/15 px-4 py-3 shadow-lg shadow-blue-950/20">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div>
                  <p className="text-sm font-bold text-blue-100">
                    Update available
                  </p>
                  <p className="text-xs text-blue-100/80">
                    Refresh to load the newest app version.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={refreshApp}
                  className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-bold text-white hover:bg-blue-400"
                >
                  Refresh App
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setActiveTab("instructions")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "instructions"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Instructions
          </button>

          <button
            onClick={() => setActiveTab("calculator")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "calculator"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Calculator
          </button>

          <button
            onClick={() => setActiveTab("breakdown")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "breakdown"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Efficiency Breakdown
          </button>

          <button
            onClick={() => setActiveTab("upgrades")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "upgrades"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Upgrade Advisor
          </button>

          <button
            onClick={() => setActiveTab("optimizer")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "optimizer"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Optimizer
          </button>

          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === "settings"
                ? "bg-indigo-600 text-white"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            Optimizer Settings
          </button>
        </div>

        {activeTab === "instructions" && <InstructionsTab />}

        {activeTab === "calculator" && (
          <CalculatorTab
            accessSettings={accessSettings}
            setAccessSettings={setAccessSettings}
            ringSlotLimit={ringSlotLimit}
            setRingSlotLimit={setRingSlotLimit}
            selectedPan={selectedPan}
            selectedPanEnchant={selectedPanEnchant}
            selectedShovel={selectedShovel}
            selectedNecklace={selectedNecklace}
            selectedNecklaceMutation={selectedNecklaceMutation}
            selectedCharm={selectedCharm}
            selectedCharmMutation={selectedCharmMutation}
            selectedRings={selectedRings}
            selectedRingMutations={selectedRingMutations}
            permanentBuffs={permanentBuffs}
            setPermanentBuffs={setPermanentBuffs}
            selectedConsumables={selectedConsumables}
            setSelectedPan={setSelectedPan}
            setSelectedPanEnchant={setSelectedPanEnchant}
            setSelectedShovel={setSelectedShovel}
            setSelectedNecklace={setSelectedNecklace}
            setSelectedNecklaceMutation={setSelectedNecklaceMutation}
            setSelectedCharm={setSelectedCharm}
            setSelectedCharmMutation={setSelectedCharmMutation}
            updateRing={updateRing}
            updateRingMutation={updateRingMutation}
            toggleConsumable={toggleConsumable}
            museumColumnOne={museumColumnOne}
            museumColumnTwo={museumColumnTwo}
            museumSlots={museumSlots}
            updateMuseumSlot={updateMuseumSlot}
            evaluatedBuild={evaluatedBuild}
            lockedSlots={lockedSlots}
            setLockedSlots={setLockedSlots}
          />
        )}

        {activeTab === "breakdown" && (
          <BreakdownTab evaluatedBuild={evaluatedBuild} />
        )}

        {activeTab === "upgrades" && (
          <UpgradesTab
            canRunAdvisor={canRunUpgradeAdvisor}
            loading={upgradeAdvisorLoading}
            upgradeRecommendations={upgradeRecommendations}
            onRunAdvisor={runUpgradeAdvisor}
            needsRefresh={upgradeAdvisorNeedsRefresh}
          />
        )}

        {activeTab === "optimizer" && (
          <OptimizerPage
            buildState={optimizationBuildState}
            loading={optimizerLoading}
            optimizable={optimizable}
            results={optimizerResults}
            applyBuildState={applyBuildState}
            canUndoOptimizerLoad={undoOptimizerBuild !== null}
            undoOptimizerLoadBuild={undoOptimizerLoadBuild}
            selectedOptimizerBuildHash={selectedOptimizerBuildHash}
            setSelectedOptimizerBuildHash={setSelectedOptimizerBuildHash}
            optimizerLocked={optimizerLocked}
            optimizerBaselineEfficiency={optimizerBaselineEfficiency}
            evaluatedBuild={optimizerEvaluatedBuild}
            settings={optimizerSettings}
            setSettings={setOptimizerSettings}
            onRefresh={refreshOptimizerResults}
            needsRefresh={optimizerNeedsRefresh}
            lockedSlots={lockedSlots}
          />
        )}

        {activeTab === "settings" && (
          <OptimizerSettingsPage
            settings={optimizerSettings}
            setSettings={setOptimizerSettings}
          />
        )}
      </div>
    </main>
  );
}
