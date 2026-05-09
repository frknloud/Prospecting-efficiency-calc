import { useEffect, useMemo, useState } from 'react';

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
import EquipmentPanel from './components/EquipmentPanel';
import StatBadge from './components/StatBadge';

import { calculateMuseumStats } from './logic/calculateMuseumStats';
import { calculateStats } from './logic/calculateStats';
import { calculateEfficiency } from './logic/calculateEfficiency';
import { applyMutation } from './logic/applyMutations';
import { applyBuffs } from './logic/applyBuffs';
import { applyMuseum } from './logic/applyMuseum';
import { applyEnchant } from './logic/applyEnchants';
import { recommendUpgrades } from './logic/recommendUpgrades';
import { isBuildReadyForRecommendations } from './logic/isBuildReadyForRecommendations';

import type { BuildState, MuseumSlotSelection, Rarity, StatKey } from './types';

const STORAGE_KEY = 'prospecting-build-v1';
const RING_SLOT_COUNT = 8;

const museumLegend: StatKey[] = [
  'luck',
  'capacity',
  'digStrength',
  'digSpeed',
  'shakeStrength',
  'shakeSpeed',
  'sizeBoost',
  'modifierBoost',
  'sellBoost'
];

const statDisplayNames: Record<StatKey, string> = {
  luck: 'Luck',
  capacity: 'Capacity',
  digStrength: 'Dig Strength',
  digSpeed: 'Dig Speed',
  shakeStrength: 'Shake Strength',
  shakeSpeed: 'Shake Speed',
  sizeBoost: 'Size Boost',
  modifierBoost: 'Modifier Boost',
  sellBoost: 'Sell Boost',
  walkSpeed: 'Walk Speed'
};

function loadSavedBuild() {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const savedBuild = useMemo(() => loadSavedBuild(), []);

  const [ringSlotLimit, setRingSlotLimit] = useState<6 | 8>(
    savedBuild?.ringSlotLimit ?? 8
  );

  const [selectedPan, setSelectedPan] = useState<string | null>(
    savedBuild?.selectedPan ?? null
  );

  const [selectedPanEnchant, setSelectedPanEnchant] = useState<string | null>(
    savedBuild?.selectedPanEnchant ?? null
  );

  const [selectedShovel, setSelectedShovel] = useState<string | null>(
    savedBuild?.selectedShovel ?? null
  );

  const [selectedNecklace, setSelectedNecklace] = useState<string | null>(
    savedBuild?.selectedNecklace ?? null
  );

  const [selectedNecklaceMutation, setSelectedNecklaceMutation] = useState<string | null>(
    savedBuild?.selectedNecklaceMutation ?? null
  );

  const [selectedCharm, setSelectedCharm] = useState<string | null>(
    savedBuild?.selectedCharm ?? null
  );

  const [selectedCharmMutation, setSelectedCharmMutation] = useState<string | null>(
    savedBuild?.selectedCharmMutation ?? null
  );

  const [enabledBuffs, setEnabledBuffs] = useState<string[]>(
    savedBuild?.enabledBuffs ?? []
  );

  const [selectedRings, setSelectedRings] = useState<Array<string | null>>(
    savedBuild?.selectedRings ?? Array(RING_SLOT_COUNT).fill(null)
  );

  const [selectedRingMutations, setSelectedRingMutations] = useState<Array<string | null>>(
    savedBuild?.selectedRingMutations ?? Array(RING_SLOT_COUNT).fill(null)
  );

  const [museumSlots, setMuseumSlots] = useState<MuseumSlotSelection[]>(
    savedBuild?.museumSlots ??
      museumSlotsData.map((slot) => ({
        slotId: slot.slotId,
        rarity: slot.rarity as Rarity,
        mineralId: null,
        modifierId: null
      }))
  );

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
        enabledBuffs,
        selectedRings,
        selectedRingMutations,
        museumSlots
      })
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
    enabledBuffs,
    selectedRings,
    selectedRingMutations,
    museumSlots
  ]);

  const museumColumnOne = museumSlots.filter((slot) => slot.slotId <= 9);
  const museumColumnTwo = museumSlots.filter((slot) => slot.slotId >= 10);

  const museumMultipliers = useMemo(
    () => calculateMuseumStats(museumSlots),
    [museumSlots]
  );

  const activeRings = selectedRings.slice(0, ringSlotLimit);
  const activeRingMutations = selectedRingMutations.slice(0, ringSlotLimit);

  const selectedEquipment = useMemo(() => {
    const pan = pans.find((item) => item.name === selectedPan);
    const panEnchant = enchants.find((item) => item.name === selectedPanEnchant);
    const shovel = shovels.find((item) => item.name === selectedShovel);
    const necklace = necklaces.find((item) => item.name === selectedNecklace);
    const necklaceMutation = mutations.find((item) => item.name === selectedNecklaceMutation);
    const charm = charms.find((item) => item.name === selectedCharm);
    const charmMutation = mutations.find((item) => item.name === selectedCharmMutation);

    const ringItems = activeRings.map((ringName, index) => {
      const ring = rings.find((item) => item.name === ringName);
      const mutation = mutations.find((item) => item.name === activeRingMutations[index]);

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
      ...ringItems
    ];
  }, [
    selectedPan,
    selectedPanEnchant,
    selectedShovel,
    selectedNecklace,
    selectedNecklaceMutation,
    selectedCharm,
    selectedCharmMutation,
    activeRings,
    activeRingMutations
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

  const buildState: BuildState = {
    panId: selectedPan,
    panEnchantId: selectedPanEnchant,
    shovelId: selectedShovel,
    necklaceId: selectedNecklace,
    necklaceMutationId: selectedNecklaceMutation,
    charmId: selectedCharm,
    charmMutationId: selectedCharmMutation,
    rings: activeRings.map((ringId, index) => ({
      ringId,
      mutationId: activeRingMutations[index]
    })),
    museumSlots
  };

  const showRecommendations = isBuildReadyForRecommendations(buildState);

  const upgradeRecommendations = useMemo(
    () =>
      showRecommendations
        ? recommendUpgrades(buildState, ringSlotLimit)
        : [],
    [buildState, ringSlotLimit, showRecommendations]
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
    setEnabledBuffs((prev) =>
      prev.includes(buffId)
        ? prev.filter((id) => id !== buffId)
        : [...prev, buffId]
    );
  }

  return (
    <main className="min-h-screen p-4 bg-slate-900 text-white overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          Prospecting Efficiency Calculator
        </h1>

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
          />

          <section className="bg-slate-800 rounded-2xl p-4 shadow-lg self-start text-sm">
            <h2 className="text-xl font-semibold mb-4">Museum Setup</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mb-4">
              {museumLegend.map((stat) => (
                <div
                  key={stat}
                  className="flex items-center gap-3 bg-slate-800 rounded-xl px-4 py-3 border border-slate-700"
                >
                  <StatBadge statKey={stat} />

                  <span className="text-sm font-medium text-slate-100">
                    {statDisplayNames[stat]}
                  </span>
                </div>
              ))}
            </div>

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

          <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 self-start text-sm">
            <div>
              <h2 className="text-xl font-semibold mb-3">
                Efficiency Score
              </h2>

              <div className="bg-indigo-600 rounded-2xl p-4 text-center">
                <div className="text-xs uppercase tracking-wide text-indigo-200 mb-1">
                  Efficiency
                </div>

                <div className="text-4xl font-bold">
                  {efficiencyResult.efficiency.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="bg-slate-700 rounded-2xl p-4">
              <h3 className="text-lg font-semibold mb-3">
                Next Best Upgrades
              </h3>

              {!showRecommendations ? (
                <div className="text-sm text-slate-400">
                  Select most of your build before upgrade recommendations appear.
                </div>
              ) : (
                <div className="space-y-2">
                  {upgradeRecommendations.map((upgrade, index) => (
                    <div
                      key={`${upgrade.slot}-${upgrade.itemName}-${index}`}
                      className="bg-slate-800 rounded-xl p-3"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <div className="font-semibold text-slate-100">
                            {upgrade.slot}
                          </div>

                          <div className="text-sm text-slate-300">
                            {upgrade.itemName}
                            {upgrade.mutationName
                              ? ` + ${upgrade.mutationName}`
                              : ''}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-green-400 font-bold">
                            +{upgrade.percentGain.toFixed(2)}%
                          </div>

                          <div className="text-xs text-slate-400">
                            +{upgrade.efficiencyGain.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {upgrade.digsImproved && (
                        <div className="mt-2 text-xs text-amber-300 font-semibold">
                          Dig breakpoint improvement
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
