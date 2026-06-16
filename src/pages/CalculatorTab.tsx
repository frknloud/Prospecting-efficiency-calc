import EquipmentPanel from "../components/EquipmentPanel";
import MuseumSlotSelector from "../components/MuseumSlotSelector";
import { formatStatLabel } from "../utils/statLabels";
import { buildMuseumMultiplierBonuses } from "../engine/applyMuseum";

import type { MuseumSlotSelection } from "../engine/types";
import type { PermanentBuffsState } from "../components/PermanentBuffsPanel";
import type { ConsumablesState } from "../components/ConsumablesPanel";
import type { EvaluatedBuild } from "../engine/evaluatedTypes";

import type { Dispatch, SetStateAction } from "react";

interface CalculatorTabProps {
  ringSlotLimit: 6 | 8;
  setRingSlotLimit: Dispatch<SetStateAction<6 | 8>>;

  selectedPan: string | null;
  selectedPanEnchant: string | null;
  selectedShovel: string | null;

  selectedNecklace: string | null;
  selectedNecklaceMutation: string | null;

  selectedCharm: string | null;
  selectedCharmMutation: string | null;

  selectedRings: Array<string | null>;
  selectedRingMutations: Array<string | null>;

  permanentBuffs: PermanentBuffsState;
  setPermanentBuffs: Dispatch<SetStateAction<PermanentBuffsState>>;
  selectedConsumables: ConsumablesState;

  setSelectedPan: Dispatch<SetStateAction<string | null>>;
  setSelectedPanEnchant: Dispatch<SetStateAction<string | null>>;
  setSelectedShovel: Dispatch<SetStateAction<string | null>>;

  setSelectedNecklace: Dispatch<SetStateAction<string | null>>;
  setSelectedNecklaceMutation: Dispatch<SetStateAction<string | null>>;

  setSelectedCharm: Dispatch<SetStateAction<string | null>>;
  setSelectedCharmMutation: Dispatch<SetStateAction<string | null>>;

  updateRing: (index: number, value: string | null) => void;
  updateRingMutation: (index: number, value: string | null) => void;

  toggleConsumable: (category: keyof ConsumablesState, id: string) => void;

  museumColumnOne: MuseumSlotSelection[];
  museumColumnTwo: MuseumSlotSelection[];
  museumSlots: MuseumSlotSelection[];
  updateMuseumSlot: (slot: MuseumSlotSelection) => void;

  evaluatedBuild: EvaluatedBuild;
}

export default function CalculatorTab({
  ringSlotLimit,
  setRingSlotLimit,
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
  setPermanentBuffs,
  selectedConsumables,
  setSelectedPan,
  setSelectedPanEnchant,
  setSelectedShovel,
  setSelectedNecklace,
  setSelectedNecklaceMutation,
  setSelectedCharm,
  setSelectedCharmMutation,
  updateRing,
  updateRingMutation,
  toggleConsumable,
  museumColumnOne,
  museumColumnTwo,
  museumSlots,
  updateMuseumSlot,
  evaluatedBuild,
}: CalculatorTabProps) {
  const finalStatEntries = Object.entries(evaluatedBuild.stats).flatMap(
    ([key, value]) => {
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
    },
  );

  const museumMultiplierEntries = Object.entries(
    buildMuseumMultiplierBonuses({
      ...evaluatedBuild.build,
      museumSlots,
    }),
  )
    .map(([key, value]) => ({
      key,
      label: formatStatLabel(key),
      multiplier: 1 + Number(value ?? 0),
    }))
    .filter((entry) => Number.isFinite(entry.multiplier) && entry.multiplier !== 1)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 2xl:grid-cols-[1fr_1.25fr_0.9fr] gap-4 items-start">
        <EquipmentPanel
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
        />

        <section className="bg-slate-800 rounded-2xl p-4 shadow-lg self-start text-sm">
          <div className="mb-4">
            <h2 className="text-xl font-semibold">Museum Setup</h2>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-3">
              {museumColumnOne.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                          slot={slot}
                  allSlots={museumSlots}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>

            <div className="space-y-3">
              {museumColumnTwo.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                          slot={slot}
                  allSlots={museumSlots}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 self-start text-sm">
          <div>
            <h2 className="text-xl font-semibold mb-3">Efficiency Score</h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="bg-indigo-600 rounded-2xl p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-indigo-200 mb-1">
                  Efficiency
                </div>
                <div className="text-4xl font-bold">
                  {evaluatedBuild.efficiency.toFixed(2)}
                </div>
              </div>

              <div className="bg-sky-700 rounded-2xl p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-sky-200 mb-1">
                  Modifier Efficiency
                </div>
                <div className="text-4xl font-bold">
                  {evaluatedBuild.modifierEfficiency.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Final Stats</h3>

            <div className="space-y-2">
              {finalStatEntries.map(({ key, label, value }) => (
                <div
                  key={key}
                  className="flex justify-between bg-slate-700 rounded-lg px-3 py-2"
                >
                  <span>{label}</span>
                  <span>{value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">Museum</h3>

            {museumMultiplierEntries.length > 0 ? (
              <div className="space-y-2">
                {museumMultiplierEntries.map(({ key, label, multiplier }) => (
                  <div
                    key={key}
                    className="grid grid-cols-[auto_1fr] items-center gap-x-3 bg-slate-700 rounded-lg px-3 py-2"
                  >
                    <span className="font-mono tabular-nums text-right text-emerald-300 min-w-[5.5rem]">
                      + {multiplier.toFixed(2)}x
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="bg-slate-700 rounded-lg px-3 py-2 text-slate-300">
                No museum multiplier bonuses selected.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
