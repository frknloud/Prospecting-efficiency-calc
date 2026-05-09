import EquipmentPanel from '../EquipmentPanel';
import MuseumSlotSelector from '../MuseumSlotSelector';
import StatBadge from '../StatBadge';

import type { StatKey } from '../../types';
import type { MuseumSlotSelection } from '../../types';

import type { Dispatch, SetStateAction } from 'react';

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

  enabledBuffs: string[];

  enabledRingIds: string[];

  setSelectedPan: Dispatch<SetStateAction<string | null>>;
  setSelectedPanEnchant: Dispatch<SetStateAction<string | null>>;
  setSelectedShovel: Dispatch<SetStateAction<string | null>>;

  setSelectedNecklace: Dispatch<SetStateAction<string | null>>;
  setSelectedNecklaceMutation: Dispatch<
    SetStateAction<string | null>
  >;

  setSelectedCharm: Dispatch<SetStateAction<string | null>>;
  setSelectedCharmMutation: Dispatch<
    SetStateAction<string | null>
  >;

  updateRing: (index: number, value: string | null) => void;
  updateRingMutation: (index: number, value: string | null) => void;

  toggleBuff: (buffId: string) => void;
  toggleRingEnabled: (ringName: string) => void;

  museumMultipliers: any;
  museumLegend: any;
  statDisplayNames: any;

  museumColumnOne: any[];
  museumColumnTwo: any[];

  museumSlots: MuseumSlotSelection[];

  updateMuseumSlot: (slot: any) => void;

  totalStats: any;

  efficiencyResult: any;
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

  enabledBuffs,

  enabledRingIds,

  setSelectedPan,
  setSelectedPanEnchant,
  setSelectedShovel,
  setSelectedNecklace,
  setSelectedNecklaceMutation,

  setSelectedCharm,
  setSelectedCharmMutation,

  updateRing,
  updateRingMutation,

  toggleBuff,
  toggleRingEnabled,

  museumMultipliers,
  museumLegend,
  statDisplayNames,

  museumColumnOne,
  museumColumnTwo,

  museumSlots,

  updateMuseumSlot,

  totalStats,

  efficiencyResult
}: CalculatorTabProps) {
  return (
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
            enabledBuffs={enabledBuffs}
            setSelectedPan={setSelectedPan}
            setSelectedPanEnchant={setSelectedPanEnchant}
            setSelectedShovel={setSelectedShovel}
            setSelectedNecklace={setSelectedNecklace}
            setSelectedNecklaceMutation={setSelectedNecklaceMutation}
            setSelectedCharm={setSelectedCharm}
            setSelectedCharmMutation={setSelectedCharmMutation}
            updateRing={updateRing}
            updateRingMutation={updateRingMutation}
            toggleBuff={toggleBuff}
            enabledRingIds={enabledRingIds}
            toggleRingEnabled={toggleRingEnabled}
          />

          <section className="bg-slate-800 rounded-2xl p-4 shadow-lg self-start text-sm">
            <h2 className="text-xl font-semibold mb-4">Museum Setup</h2>

            <div className="bg-slate-700 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300 mb-3">
                Final Museum Multipliers
              </h3>

              <div className="grid grid-cols-2 gap-2 text-sm">
                {Object.entries(museumMultipliers)
                  .filter(([key]) =>
                    museumLegend.includes(key as StatKey)
                  )
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="flex justify-between bg-slate-800 rounded-lg px-3 py-2"
                    >
                      <span className="flex items-center gap-2 text-slate-300">
                        <StatBadge statKey={key as StatKey} />
                        {statDisplayNames[key as StatKey]}
                      </span>

                      <span className="font-semibold text-indigo-300">
                        {typeof value === 'number'
                          ? value.toFixed(2)
                          : String(value)}
                      </span>
                    </div>
                  ))}
              </div>
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

              <div className="bg-indigo-600 rounded-2xl p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-indigo-200 mb-1">Efficiency</div>
                <div className="text-4xl font-bold">{efficiencyResult.efficiency.toFixed(2)}</div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">Final Stats</h3>

              <div className="space-y-2">
                {Object.entries(totalStats).map(([key, value]) => (
                  <div key={key} className="flex justify-between bg-slate-700 rounded-lg px-3 py-2">
                    <span className="capitalize">{key}</span>
                    <span>{Number(value ?? 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
  );
}
