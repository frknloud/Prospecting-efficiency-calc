import { useMemo, useState } from 'react';

import museumSlotsData from './data/museum-slots.json';
import pans from './data/pans.json';
import shovels from './data/shovels.json';
import rings from './data/rings.json';
import necklaces from './data/necklaces.json';
import charms from './data/charms.json';
import mutations from './data/mutations.json';
import buffs from './data/buffs.json';
import enchants from './data/enchants.json';

import MuseumSlotSelector from './components/MuseumSlotSelector';
import EquipmentSelector from './components/EquipmentSelector';
import MutationSelector from './components/MutationSelector';
import ToggleCard from './components/ToggleCard';
import EnchantSelector from './components/EnchantSelector';

import {
  MuseumSlotSelection,
  Rarity
} from './types';

import { calculateMuseumStats } from './logic/calculateMuseumStats';
import { calculateStats } from './logic/calculateStats';
import { calculateEfficiency } from './logic/calculateEfficiency';
import { applyMutation } from './logic/applyMutations';
import { applyBuffs } from './logic/applyBuffs';
import { applyMuseum } from './logic/applyMuseum';
import { applyEnchant } from './logic/applyEnchants';
import { filterAvailableRings } from './logic/filterAvailableRings';

const RING_SLOT_COUNT = 8;

export default function App() {
  const [selectedPan, setSelectedPan] = useState<string | null>(null);
  const [selectedPanEnchant, setSelectedPanEnchant] = useState<string | null>(null);
  const [selectedShovel, setSelectedShovel] = useState<string | null>(null);

  const [selectedRings, setSelectedRings] = useState<Array<string | null>>(
    Array(RING_SLOT_COUNT).fill(null)
  );

  const [selectedRingMutations, setSelectedRingMutations] = useState<Array<string | null>>(
    Array(RING_SLOT_COUNT).fill(null)
  );

  const [selectedNecklace, setSelectedNecklace] = useState<string | null>(null);
  const [selectedNecklaceMutation, setSelectedNecklaceMutation] = useState<string | null>(null);

  const [selectedCharm, setSelectedCharm] = useState<string | null>(null);
  const [selectedCharmMutation, setSelectedCharmMutation] = useState<string | null>(null);

  const [enabledBuffs, setEnabledBuffs] = useState<string[]>([]);

  const [museumSlots, setMuseumSlots] = useState<MuseumSlotSelection[]>(
    museumSlotsData.map((slot) => ({
      slotId: slot.slotId,
      rarity: slot.rarity as Rarity,
      mineralId: null,
      modifierId: null
    }))
  );

  const museumMultipliers = useMemo(
    () => calculateMuseumStats(museumSlots),
    [museumSlots]
  );

  const selectedEquipment = useMemo(() => {
    const pan = pans.find((item) => item.name === selectedPan);

    const panEnchant = enchants.find(
      (enchant) => enchant.name === selectedPanEnchant
    );

    const shovel = shovels.find((item) => item.name === selectedShovel);

    const necklace = necklaces.find(
      (item) => item.name === selectedNecklace
    );

    const necklaceMutation = mutations.find(
      (mutation) => mutation.name === selectedNecklaceMutation
    );

    const charm = charms.find(
      (item) => item.name === selectedCharm
    );

    const charmMutation = mutations.find(
      (mutation) => mutation.name === selectedCharmMutation
    );

    const selectedRingItems = selectedRings.map((ringName, index) => {
      const ring = rings.find((item) => item.name === ringName);

      const mutation = mutations.find(
        (item) => item.name === selectedRingMutations[index]
      );

      if (!ring) return undefined;

      return {
        ...ring,
        stats: applyMutation(ring.stats, mutation)
      };
    });

    return [
      pan
        ? {
            ...pan,
            stats: applyEnchant(pan.stats, panEnchant)
          }
        : undefined,
      shovel,
      necklace
        ? {
            ...necklace,
            stats: applyMutation(necklace.stats, necklaceMutation)
          }
        : undefined,
      charm
        ? {
            ...charm,
            stats: applyMutation(charm.stats, charmMutation)
          }
        : undefined,
      ...selectedRingItems
    ];
  }, [
    selectedPan,
    selectedPanEnchant,
    selectedShovel,
    selectedRings,
    selectedRingMutations,
    selectedNecklace,
    selectedNecklaceMutation,
    selectedCharm,
    selectedCharmMutation
  ]);

  const baseStats = useMemo(
    () => calculateStats(selectedEquipment),
    [selectedEquipment]
  );

  const activeBuffs = useMemo(
    () => buffs.filter((buff) => enabledBuffs.includes(buff.id)),
    [enabledBuffs]
  );

  const buffedStats = useMemo(
    () => applyBuffs(baseStats, activeBuffs),
    [baseStats, activeBuffs]
  );

  const totalStats = useMemo(
    () => applyMuseum(buffedStats, museumMultipliers),
    [buffedStats, museumMultipliers]
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

  function updateRing(index: number, value: string | null) {
    setSelectedRings((prev) =>
      prev.map((ring, ringIndex) =>
        ringIndex === index ? value : ring
      )
    );
  }

  function updateRingMutation(index: number, value: string | null) {
    setSelectedRingMutations((prev) =>
      prev.map((mutation, mutationIndex) =>
        mutationIndex === index ? value : mutation
      )
    );
  }

  function toggleBuff(buffId: string) {
    setEnabledBuffs((prev) => {
      if (prev.includes(buffId)) {
        return prev.filter((id) => id !== buffId);
      }

      return [...prev, buffId];
    });
  }

  return (
    <main className="min-h-screen p-6 bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">
          Prospecting Efficiency Calculator
        </h1>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
            <h2 className="text-2xl font-semibold">
              Equipment
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EquipmentSelector
                label="Pan"
                items={pans}
                value={selectedPan}
                getName={(item) => item.name}
                onChange={setSelectedPan}
              />

              <EnchantSelector
                label="Pan Enchant"
                enchants={enchants}
                value={selectedPanEnchant}
                onChange={setSelectedPanEnchant}
              />
            </div>

            <EquipmentSelector
              label="Shovel"
              items={shovels}
              value={selectedShovel}
              getName={(item) => item.name}
              onChange={setSelectedShovel}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EquipmentSelector
                label="Necklace"
                items={necklaces}
                value={selectedNecklace}
                getName={(item) => item.name}
                onChange={setSelectedNecklace}
              />

              <MutationSelector
                label="Necklace Mutation"
                mutations={mutations}
                value={selectedNecklaceMutation}
                onChange={setSelectedNecklaceMutation}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <EquipmentSelector
                label="Charm"
                items={charms}
                value={selectedCharm}
                getName={(item) => item.name}
                onChange={setSelectedCharm}
              />

              <MutationSelector
                label="Charm Mutation"
                mutations={mutations}
                value={selectedCharmMutation}
                onChange={setSelectedCharmMutation}
              />
            </div>

            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-xl font-semibold mb-3">
                Rings
              </h3>

              <div className="space-y-3">
                {selectedRings.map((value, index) => {
                  const availableRings = filterAvailableRings(
                    rings,
                    selectedRings,
                    index
                  );

                  return (
                    <div
                      key={index}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <EquipmentSelector
                        label={`Ring ${index + 1}`}
                        items={availableRings}
                        value={value}
                        getName={(item) => item.name}
                        getId={(item) => item.id ?? item.name}
                        onChange={(newValue) =>
                          updateRing(index, newValue)
                        }
                      />

                      <MutationSelector
                        label={`Ring ${index + 1} Mutation`}
                        mutations={mutations}
                        value={selectedRingMutations[index]}
                        onChange={(newValue) =>
                          updateRingMutation(index, newValue)
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-700">
              <h3 className="text-xl font-semibold mb-3">
                Totems
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {buffs.map((buff) => (
                  <ToggleCard
                    key={buff.id}
                    label={buff.name}
                    enabled={enabledBuffs.includes(buff.id)}
                    onToggle={() => toggleBuff(buff.id)}
                  />
                ))}
              </div>
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg self-start">
            <h2 className="text-2xl font-semibold mb-4">
              Museum Setup
            </h2>

            <div className="space-y-3">
              {museumSlots.map((slot) => (
                <MuseumSlotSelector
                  key={slot.slotId}
                  slot={slot}
                  onChange={updateMuseumSlot}
                />
              ))}
            </div>
          </section>

          <section className="bg-slate-800 rounded-2xl p-6 shadow-lg space-y-6 self-start">
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
                  <span>{efficiencyResult.cycleTime.toFixed(2)}</span>
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
                    <span className="capitalize">{key}</span>

                    <span>{Number(value).toFixed(2)}</span>
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
