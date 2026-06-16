import { useEffect, useMemo, useState } from "react";

import museumSlotsData from "./data/museum-slots.json";

import CalculatorTab from "./pages/CalculatorTab";
import BreakdownTab from "./pages/BreakdownTab";

import { createBuildState } from "./engine/createBuildState";
import { normalizeBuildState } from "./engine/normalizeBuildState";
import { useEvaluatedBuild } from "./hooks/useEvaluatedBuild";
import { useAppUpdateCheck } from "./hooks/useAppUpdateCheck";

import type { BuildState, MuseumSlotSelection, Rarity } from "./engine/types";

import {
  createDefaultPermanentBuffs,
} from "./components/PermanentBuffsPanel";
import type { PermanentBuffsState } from "./components/PermanentBuffsPanel";
import type { ConsumablesState } from "./components/ConsumablesPanel";

const STORAGE_KEY = "prospecting-build-v5";
const ACTIVE_TAB_STORAGE_KEY = "prospecting-active-tab-v1";
const RING_SLOT_COUNT = 8;

type AppTab = "calculator" | "breakdown";

function loadSavedActiveTab(): AppTab {
  if (typeof window === "undefined") {
    return "calculator";
  }

  const savedTab = localStorage.getItem(ACTIVE_TAB_STORAGE_KEY) as AppTab | null;

  if (savedTab === "calculator" || savedTab === "breakdown") {
    return savedTab;
  }

  return "calculator";
}

const createDefaultMuseumSlots = (): MuseumSlotSelection[] =>
  museumSlotsData.map((slot) => ({
    slotId: slot.slotId,
    rarity: slot.rarity as Rarity,
    mineralId: null,
    modifierId: null,
  }));

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

  const [permanentBuffs, setPermanentBuffs] = useState<PermanentBuffsState>({
    ...createDefaultPermanentBuffs(),
    ...(savedBuild?.permanentBuffs ?? {}),
  });

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
  ]);

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

  const normalizedBuildState: BuildState = useMemo(
    () => normalizeBuildState(buildState, ringSlotLimit),
    [buildState, ringSlotLimit],
  );

  const evaluatedBuild = useEvaluatedBuild(normalizedBuildState);

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
        </div>

        {activeTab === "calculator" && (
          <CalculatorTab
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
          />
        )}

        {activeTab === "breakdown" && (
          <BreakdownTab evaluatedBuild={evaluatedBuild} />
        )}
      </div>
    </main>
  );
}
