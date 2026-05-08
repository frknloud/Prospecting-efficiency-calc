import { useMemo, useState } from 'react';

import museumSlotsData from './data/museum-slots.json';

import MuseumSlotSelector from './components/MuseumSlotSelector';

import {
  MuseumSlotSelection,
  Rarity
} from './types';

import { calculateMuseumStats } from './logic/calculateMuseumStats';

export default function App() {
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-semibold mb-4">
              Museum Stat Totals
            </h2>

            <div className="space-y-2">
              {Object.entries(museumStats).length === 0 && (
                <p className="text-slate-400">
                  Select minerals to begin calculating stats.
                </p>
              )}

              {Object.entries(museumStats).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-slate-700 rounded-lg px-4 py-2"
                >
                  <span className="capitalize">
                    {key}
                  </span>

                  <span>
                    +{Number(value).toFixed(3)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
