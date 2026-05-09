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

import CalculatorTab from './components/tabs/CalculatorTab';
import UpgradesTab from './components/tabs/UpgradesTab';

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

  const [enabledRingIds, setEnabledRingIds] = useState<string[]>(
    savedBuild?.enabledRingIds ?? rings.map((ring) => ring.name)
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
  
  const [activeTab, setActiveTab] = useState<
    'calculator' | 'breakdown' | 'upgrades'
  >('calculator');  

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
        enabledRingIds,
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
    enabledRingIds,
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

  const availableRings = useMemo(
    () => rings.filter((ring) => enabledRingIds.includes(ring.name)),
    [enabledRingIds]
  );

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
    museumSlots,
    enabledRingIds
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

  function toggleRingEnabled(ringName: string) {
    setEnabledRingIds((prev) =>
      prev.includes(ringName)
        ? prev.filter((id) => id !== ringName)
        : [...prev, ringName]
    );
  }

  return (
    <main className="min-h-screen p-4 bg-slate-900 text-white overflow-x-hidden">
      <div className="max-w-[1800px] mx-auto">
        <h1 className="text-3xl font-bold mb-4">
          Prospecting Efficiency Calculator
        </h1>

        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === 'calculator'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            Calculator
          </button>

          <button
            onClick={() => setActiveTab('breakdown')}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === 'breakdown'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            Efficiency Breakdown
          </button>

          <button
            onClick={() => setActiveTab('upgrades')}
            className={`px-4 py-2 rounded-xl font-semibold ${
              activeTab === 'upgrades'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            Upgrade Advisor
          </button>
        </div>
        
      {activeTab === 'calculator' && (
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

              enabledBuffs={enabledBuffs}
              enabledRingIds={enabledRingIds}

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
              toggleRingEnabled={toggleRingEnabled}

              museumMultipliers={museumMultipliers}
              museumLegend={museumLegend}
              statDisplayNames={statDisplayNames}
          
              museumColumnOne={museumColumnOne}
              museumColumnTwo={museumColumnTwo}
          
              museumSlots={museumSlots}
          
              updateMuseumSlot={updateMuseumSlot}
          
              totalStats={totalStats}
          
              efficiencyResult={efficiencyResult}
            />
      )}
      
      {activeTab === 'breakdown' && (
	<section className="bg-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">
            Efficiency Breakdown
          </h2>

          <div className="space-y-4">
            <div className="bg-slate-700 rounded-xl p-4">
              <div className="text-lg font-semibold mb-2">
                Core Formula
              </div>
      
              <div className="text-slate-300">
                Luck and Capacity increase score while
                shake/dig time lowers efficiency.
              </div>
            </div>
      
            <div className="bg-slate-700 rounded-xl p-4">
              <div className="font-semibold mb-2">
                Current Efficiency
              </div>
      
              <div className="text-4xl font-bold text-indigo-300">
                {efficiencyResult.efficiency.toFixed(2)}
              </div>
            </div>
          </div>
        </section>
      )}      

      {activeTab === 'upgrades' && (
          <UpgradesTab
              showRecommendations={showRecommendations}
              upgradeRecommendations={upgradeRecommendations}
          />
      )}
        
      </div>
    </main>
  );
}
