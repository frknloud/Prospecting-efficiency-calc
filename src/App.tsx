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

export default function App() {
  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">
          Prospecting Efficiency Calculator
        </h1>

        <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
          <h2 className="text-2xl font-semibold mb-4">
            App Restoration Required
          </h2>

          <p className="text-slate-300 leading-relaxed">
            The previous commit accidentally truncated App.tsx during a UI refactor.
            This patch restores the missing default export so builds succeed again.
          </p>
        </div>
      </div>
    </main>
  );
}
