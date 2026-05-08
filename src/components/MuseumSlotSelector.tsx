import minerals from '../data/museum-minerals.json';
import modifiers from '../data/museum-modifiers.json';

import { MuseumSlotSelection } from '../types';

interface Props {
  slot: MuseumSlotSelection;
  onChange: (slot: MuseumSlotSelection) => void;
}

export default function MuseumSlotSelector({
  slot,
  onChange
}: Props) {
  const availableMinerals = minerals.filter(
    (mineral) => mineral.rarity === slot.rarity
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-700 rounded-xl p-4">
      <div>
        <label className="block text-sm mb-1 text-slate-300">
          Rarity
        </label>

        <div className="bg-slate-800 rounded-lg px-3 py-2 capitalize">
          {slot.rarity}
        </div>
      </div>

      <div>
        <label className="block text-sm mb-1 text-slate-300">
          Mineral
        </label>

        <select
          className="w-full bg-slate-800 rounded-lg px-3 py-2"
          value={slot.mineralId ?? ''}
          onChange={(e) =>
            onChange({
              ...slot,
              mineralId: e.target.value || null
            })
          }
        >
          <option value="">Select Mineral</option>

          {availableMinerals.map((mineral) => (
            <option key={mineral.id} value={mineral.id}>
              {mineral.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm mb-1 text-slate-300">
          Modifier
        </label>

        <select
          className="w-full bg-slate-800 rounded-lg px-3 py-2"
          value={slot.modifierId ?? ''}
          onChange={(e) =>
            onChange({
              ...slot,
              modifierId: e.target.value || null
            })
          }
        >
          <option value="">No Modifier</option>

          {modifiers.map((modifier) => (
            <option key={modifier.id} value={modifier.id}>
              {modifier.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
