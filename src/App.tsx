import { useMemo, useState } from 'react';

import museumSlotsData from './data/museum-slots.json';
import MuseumSlotSelector from './components/MuseumSlotSelector';
import StatBadge from './components/StatBadge';

import { calculateMuseumStats } from './logic/calculateMuseumStats';

import type { MuseumSlotSelection, Rarity } from './types';

const museumLegend = [
  { key: 'luck', label: 'Luck' },
  { key: 'capacity', label: 'Capacity' },
  { key: 'digStrength', label: 'Dig Strength' },
  { key: 'digSpeed', label: 'Dig Speed' },
  { key: 'shakeStrength', label: 'Shake Strength' },
  { key: 'shakeSpeed', label: 'Shake Speed' },
  { key: 'sizeBoost', label: 'Size Boost' },
  { key: 'modifierBoost', label: 'Modifier Boost' },
  { key: 'sellBoost', label: 'Sell Boost' }
];

export default function App() {
  const [museumSlots, setMuseumSlots] = useState<MuseumSlotSelection[]>(
    museumSlotsData.map((slot) => ({
      slotId: slot.slotId,
      rarity: slot.rarity as Rarity,
      mineralId: null,
      modifierId: null
    }))
  );

  const museumColumnOne = museumSlots.filter((slot) => slot.slotId <= 9);
  const museumColumnTwo = museumSlots.filter((slot) => slot.slotId >= 10);

  const museumMultipliers = useMemo(
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
    <main className="min-h-screen bg-slate-900 text-white p-4 overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          Prospecting Efficiency Calculator
        </h1>

        <section className="bg-slate-800 rounded-2xl p-4 shadow-lg text-sm">
          <div className="flex flex-col gap-3 mb-4">
            <h2 className="text-xl font-semibold">
              Museum Setup
            </h2>

            <div className="flex flex-wrap gap-2">
              {museumLegend.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-1 bg-slate-700 rounded-lg px-2 py-1"
                >
                  <StatBadge statKey={item.key} />

                  <span className="text-xs text-slate-300">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-700 rounded-xl p-3">
              <div className="text-sm font-semibold text-slate-200 mb-2">
                Final Museum Multipliers
              </div>

              <div className="flex flex-wrap gap-2">
                {Object.entries(museumMultipliers)
                  .filter(([, value]) => Number(value) > 0)
                  .map(([key, value]) => (
                    <StatBadge
                      key={key}
                      statKey={key}
                      value={Number(value)}
                    />
                  ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="space-y-3">
              {museumColumnOne.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                  slot={slot}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>

            <div className="space-y-3">
              {museumColumnTwo.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                  slot={slot}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
