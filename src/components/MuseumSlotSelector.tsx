import minerals from '../data/museum-minerals.json';
import modifiers from '../data/museum-modifiers.json';
import { MuseumSlotSelection } from '../types';
import { filterValidMuseumModifiers } from '../logic/museumValidation';
import StatBadge from './StatBadge';

interface Props {
  slot: MuseumSlotSelection;
  onChange: (slot: MuseumSlotSelection) => void;
}

const rarityStyles: Record<string, string> = {
  common: 'bg-zinc-700 text-zinc-200',
  uncommon: 'bg-green-700 text-green-100',
  rare: 'bg-blue-700 text-blue-100',
  epic: 'bg-purple-700 text-purple-100',
  legendary: 'bg-amber-600 text-amber-100',
  mythic: 'bg-pink-700 text-pink-100',
  exotic: 'bg-red-700 text-red-100'
};

export default function MuseumSlotSelector({ slot, onChange }: Props) {
  const availableMinerals = minerals.filter(
    (mineral) =>
      !usedMinerals.includes(mineral.id) ||
      mineral.id === slot.mineralId
  );

  const selectedMineral = minerals.find(
    (mineral) => mineral.id === slot.mineralId
  );

  const usedMinerals = allSlots
    .filter((s) => s.slotId !== slot.slotId)
    .map((s) => s.mineralId)
    .filter(Boolean);

  const availableModifiers = filterValidMuseumModifiers(
    selectedMineral,
    modifiers
  );

  const selectedModifier = modifiers.find(
    (modifier) => modifier.id === slot.modifierId
  );

  const mineralStats = Object.keys(
    selectedMineral?.stats ?? {}
  );

  const modifierStats = selectedModifier?.affects ?? [];

  const statKeys = Array.from(
    new Set([
      ...mineralStats,
      ...modifierStats
    ])
  );

  const rarityClass =
    rarityStyles[slot.rarity.toLowerCase()] ?? 'bg-slate-700 text-slate-100';

  return (
    <div className="bg-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-slate-100">
          Slot {slot.slotId}
        </div>

        <div className={`text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${rarityClass}`}>
          {slot.rarity}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1 text-slate-300">Mineral</label>

          <select
            className="w-full bg-slate-800 rounded-lg px-3 py-2"
            value={slot.mineralId ?? ''}
            onChange={(e) =>
              onChange({
                ...slot,
                mineralId: e.target.value || null,
                modifierId: null
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
          <label className="block text-sm mb-1 text-slate-300">Modifier</label>

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

            {availableModifiers.map((modifier) => (
              <option key={modifier.id} value={modifier.id}>
                {modifier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {(statKeys.length > 0 || selectedMineral?.minWeight) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {statKeys.map((statKey) => (
            <StatBadge
              key={statKey}
              statKey={statKey}
            />
          ))}

          {selectedMineral?.minWeight && (
            <div className="rounded-md px-2 py-1 text-xs font-semibold bg-slate-600 text-slate-200 border border-slate-500">
              [min weight={selectedMineral.minWeight}]
            </div>
          )}
        </div>
      )}
    </div>
  );
}
