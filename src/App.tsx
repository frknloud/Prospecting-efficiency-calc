import { useMemo, useState } from 'react';

import museumSlotsData from './data/museum-slots.json';
import pans from './data/pans.json';
import shovels from './data/shovels.json';
import rings from './data/rings.json';
import necklaces from './data/necklaces.json';
import charms from './data/charms.json';

import MuseumSlotSelector from './components/MuseumSlotSelector';
import EquipmentSelector from './components/EquipmentSelector';

import {
  MuseumSlotSelection,
  Rarity
} from './types';

import { calculateMuseumStats } from './logic/calculateMuseumStats';
import { calculateStats } from './logic/calculateStats';
import { calculateEfficiency } from './logic/calculateEfficiency';

export default function App() {
  const [selectedPan, setSelectedPan] = useState<string | null>(null);
  const [selectedShovel, setSelectedShovel] = useState<string | null>(null);
  const [selectedRing, setSelectedRing] = useState<string | null>(null);
  const [selectedNecklace, setSelectedNecklace] = useState<string | null>(null);
  const [selectedCharm, setSelectedCharm] = useState<string | null>(null);

  const [museumSlots, setMuseumSlots] = useState<
    MuseumSlotSelection[]
  >(
    museumSlotsData.map((slot) => ({
      slotId: slot.slotId,
      rarity: slot.rarity as Rarity,
      mineralId: null,
      modifierId: null
    }))
  );

  const museumStats = useMemo(
    () => calculateMuseumStats(museumSlots),
    [museumSlots]
  );

  const selectedEquipment = useMemo(() => {
    return [
      pans.find((item) => item.name === selectedPan),
      shovels.find((item) => item.name === selectedShovel),
      rings.find((item) => item.name === selectedRing),
      necklaces.find((item) => item.name === selectedNecklace),
      charms.find((item) => item.name === selectedCharm)
    ];
  }, [
    selectedPan,
    selectedShovel,
    selectedRing,
    selectedNecklace,
    selectedCharm
  ]);

  const totalStats = useMemo(
    () => calculateStats(selectedEquipment, museumStats),
    [selectedEquipment, museumStats]
  );

  const efficiencyResult = useMemo(
    () => calculateEfficiency(totalStats),
    [totalStats]
  );

  function updateMuseumSlot(updated: MuseumSlotSelection) {
    setMuseumSlots((prev) =>
      prev.map((slot) =>
        slot.slotId === updated.slotId ? updated : slot
      )
    );
  }

  return (
    <main className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          Prospecting Efficiency Calculator
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-2xl font-semibold">
              Equipment
            </h2>

            <EquipmentSelector
              label="Pan"
              items={pans}
              value={selectedPan}
              getName={(item) => item.name}
              onChange={setSelectedPan}
            />

            <EquipmentSelector
              label="Shovel"
              items={shovels}
              value={selectedShovel}
              getName={(item) => item.name}
              onChange={setSelectedShovel}
            />

            <EquipmentSelector
              label="Ring"
              items={rings}
              value={selectedRing}
              getName={(item) => item.name}
              onChange={setSelectedRing}
            />

            <EquipmentSelector
              label="Necklace"
              items={necklaces}
              value={selectedNecklace}
              getName={(item) => item.name}
              onChange={setSelectedNecklace}
            />

            <EquipmentSelector
              label="Charm"
              items={charms}
              value={selectedCharm}
              getName={(item) => item.name}
              onChange={setSelectedCharm}
            />
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Museum Setup
            </h2>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
              {museumSlots.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                  slot={slot}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-6">
            <div>
              <h2 className="text-2xl font-semibold mb-4">
                Efficiency Score
              </h2>

              <div className="bg-indigo-600 rounded-2xl p-6 text-center">
                <div className="text-sm uppercase tracking-wide text-indigo-200 mb-2">
                  Efficiency
                </div>

                <div className="text-5xl font-bold">
                  {efficiencyResult.efficiency.toFixed(2)}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Cycle Metrics
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between bg-slate-700 rounded-lg px-4 py-2">
                  <span>Digs Required</span>
                  <span>{efficiencyResult.digsRequired}</span>
                </div>

                <div className="flex justify-between bg-slate-700 rounded-lg px-4 py-2">
                  <span>Cycle Time</span>
                  <span>
                    {efficiencyResult.cycleTime.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Final Stats
              </h3>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
                {Object.entries(totalStats).map(([key, value]) => (
                  <div
                    key={key}
                    className="flex justify-between bg-slate-700 rounded-lg px-4 py-2"
                  >
                    <span className="capitalize">
                      {key}
                    </span>

                    <span>
                      {Number(value).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
