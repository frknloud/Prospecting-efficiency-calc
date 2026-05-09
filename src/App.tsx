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

// remainder of file unchanged except museum section
