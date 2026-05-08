import pans from '../data/pans.json';
import shovels from '../data/shovels.json';
import rings from '../data/rings.json';
import necklaces from '../data/necklaces.json';
import charms from '../data/charms.json';
import mutations from '../data/mutations.json';
import buffs from '../data/buffs.json';
import enchants from '../data/enchants.json';

import EquipmentSelector from './EquipmentSelector';
import MutationSelector from './MutationSelector';
import ToggleCard from './ToggleCard';
import EnchantSelector from './EnchantSelector';

import { filterAvailableRings } from '../logic/filterAvailableRings';

interface Props {
  ringSlotLimit: 6 | 8;
  setRingSlotLimit: (value: 6 | 8) => void;
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
  setSelectedPan: (value: string | null) => void;
  setSelectedPanEnchant: (value: string | null) => void;
  setSelectedShovel: (value: string | null) => void;
  setSelectedNecklace: (value: string | null) => void;
  setSelectedNecklaceMutation: (value: string | null) => void;
  setSelectedCharm: (value: string | null) => void;
  setSelectedCharmMutation: (value: string | null) => void;
  updateRing: (index: number, value: string | null) => void;
  updateRingMutation: (index: number, value: string | null) => void;
  toggleBuff: (buffId: string) => void;
}

export default function EquipmentPanel(props: Props) {
  const visibleRings = props.selectedRings.slice(0, props.ringSlotLimit);

  return (
    <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Equipment</h2>

        <div className="flex items-center gap-2 bg-slate-700 rounded-xl p-1">
          <button
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${props.ringSlotLimit === 6 ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            onClick={() => props.setRingSlotLimit(6)}
          >
            6 Rings
          </button>

          <button
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${props.ringSlotLimit === 8 ? 'bg-indigo-600 text-white' : 'text-slate-300'}`}
            onClick={() => props.setRingSlotLimit(8)}
          >
            8 Rings
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <EquipmentSelector
          label="Pan"
          items={pans}
          value={props.selectedPan}
          getName={(item) => item.name}
          onChange={props.setSelectedPan}
        />

        <EnchantSelector
          label="Pan Enchant"
          enchants={enchants}
          value={props.selectedPanEnchant}
          onChange={props.setSelectedPanEnchant}
        />
      </div>

      <EquipmentSelector
        label="Shovel"
        items={shovels}
        value={props.selectedShovel}
        getName={(item) => item.name}
        onChange={props.setSelectedShovel}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <EquipmentSelector
          label="Necklace"
          items={necklaces}
          value={props.selectedNecklace}
          getName={(item) => item.name}
          onChange={props.setSelectedNecklace}
        />

        <MutationSelector
          label="Necklace Mutation"
          mutations={mutations}
          value={props.selectedNecklaceMutation}
          onChange={props.setSelectedNecklaceMutation}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <EquipmentSelector
          label="Charm"
          items={charms}
          value={props.selectedCharm}
          getName={(item) => item.name}
          onChange={props.setSelectedCharm}
        />

        <MutationSelector
          label="Charm Mutation"
          mutations={mutations}
          value={props.selectedCharmMutation}
          onChange={props.setSelectedCharmMutation}
        />
      </div>

      <div className="pt-3 border-t border-slate-700">
        <h3 className="text-lg font-semibold mb-2">Rings</h3>

        <div className="space-y-2">
          {visibleRings.map((value, index) => {
            const availableRings = filterAvailableRings(
              rings,
              props.selectedRings,
              index
            );

            return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <EquipmentSelector
                  label={`Ring ${index + 1}`}
                  items={availableRings}
                  value={value}
                  getName={(item) => item.name}
                  getId={(item) => item.id ?? item.name}
                  onChange={(newValue) => props.updateRing(index, newValue)}
                />

                <MutationSelector
                  label={`Ring ${index + 1} Mutation`}
                  mutations={mutations}
                  value={props.selectedRingMutations[index]}
                  onChange={(newValue) => props.updateRingMutation(index, newValue)}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 border-t border-slate-700">
        <h3 className="text-lg font-semibold mb-2">Totems</h3>

        <div className="grid grid-cols-1 gap-2">
          {buffs.map((buff) => (
            <ToggleCard
              key={buff.id}
              label={buff.name}
              enabled={props.enabledBuffs.includes(buff.id)}
              onToggle={() => props.toggleBuff(buff.id)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
