import { Lock, Unlock, } from "lucide-react";

import minerals from "../data/museum-minerals.json";
import modifiers from "../data/museum-modifiers.json";

import type { MuseumSlotSelection } from "../engine/types";
import type { AccessSettings } from "../access/accessTypes";

import { isItemAccessible, isMuseumMineralAccessible } from "../access/accessRules";

import { canUseMuseumModifier, filterValidMuseumMinerals, filterValidMuseumModifiers } from "../helpers/museumValidation";

import StatBadge from "./StatBadge";

interface Props {
  accessSettings: AccessSettings;
  slot: MuseumSlotSelection;
  allSlots: MuseumSlotSelection[];
  onChange: (slot: MuseumSlotSelection) => void;
  locked?: boolean;
  lockDisabled?: boolean;
  onToggleLock?: () => void;
}

const rarityStyles: Record<string, string> = {
  common: "bg-zinc-700 text-zinc-200",
  uncommon: "bg-green-700 text-green-100",
  rare: "bg-blue-700 text-blue-100",
  epic: "bg-purple-700 text-purple-100",
  legendary: "bg-amber-600 text-amber-100",
  mythic: "bg-pink-700 text-pink-100",
  exotic: "bg-red-700 text-red-100",
};

export default function MuseumSlotSelector({
  accessSettings,
  slot,
  allSlots,
  onChange,
  locked,
  lockDisabled,
  onToggleLock,
}: Props) {
  const usedMinerals = allSlots
    .filter((s: MuseumSlotSelection) => s.slotId !== slot.slotId)
    .map((s: MuseumSlotSelection) => s.mineralId)
    .filter(Boolean);

  const selectedModifier = modifiers.find(
    (modifier) => modifier.id === slot.modifierId,
  );

  const availableMinerals = minerals.filter((mineral) => {
    const rarityMatches =
      mineral.rarity.toLowerCase() === slot.rarity.toLowerCase();

    const notAlreadyUsed =
      !usedMinerals.includes(mineral.id) || mineral.id === slot.mineralId;

    const accessible =
      isMuseumMineralAccessible(
        mineral as any,
        accessSettings,
      ) || mineral.id === slot.mineralId;

    const modifierCompatible =
      canUseMuseumModifier(
        mineral,
        selectedModifier,
      );

    return (
      rarityMatches &&
      notAlreadyUsed &&
      accessible &&
      modifierCompatible
    );
  });

  const selectedMineral = minerals.find(
    (mineral) => mineral.id === slot.mineralId,
  );

  const accessFilteredModifiers =
    modifiers.filter(
      modifier =>
        isItemAccessible(
          modifier as any,
          accessSettings,
        ) ||
        modifier.id === slot.modifierId
    );

  const availableModifiers = filterValidMuseumModifiers(
    selectedMineral,
    accessFilteredModifiers,
  );

  const mineralStats = Object.keys(selectedMineral?.stats ?? {});

  const modifierStats = selectedModifier?.affects ?? [];

  const statKeys = Array.from(new Set([...mineralStats, ...modifierStats]));

  const rarityClass =
    rarityStyles[slot.rarity.toLowerCase()] ?? "bg-slate-700 text-slate-100";

  return (
    <div className="bg-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div
          className={`text-xs px-2 py-1 rounded-full font-semibold uppercase tracking-wide ${rarityClass}`}
        >
          {slot.rarity}
        </div>

        <div className="flex items-center gap-2 mb-2">

          {onToggleLock && (

            <button
              type="button"
              onClick={onToggleLock}
              disabled={lockDisabled}
              title={
                locked
                  ? "Museum slot locked"
                  : "Museum slot unlocked"
              }
              aria-label={
                locked
                  ? "Museum slot locked"
                  : "Museum slot unlocked"
              }
              className={
                locked
                  ? "bg-yellow-500 text-black rounded w-7 h-7 flex items-center justify-center disabled:opacity-70"
                  : "bg-slate-700 rounded w-7 h-7 flex items-center justify-center"
              }
            >
              {locked ? (
                <Lock size={13} />
              ) : (
                <Unlock size={13} />
              )}
            </button>
          )}

          <div className="font-semibold text-slate-100">Slot {slot.slotId}</div>

        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm mb-1 text-slate-300">Mineral</label>

          <select
            className="w-full bg-slate-800 rounded-lg px-3 py-2"
            value={slot.mineralId ?? ""}
            onChange={(e) => {
              const nextMineralId =
                e.target.value || null;

              const nextMineral =
                minerals.find(
                  mineral => mineral.id === nextMineralId
                );

              const nextModifierId =
                canUseMuseumModifier(
                  nextMineral,
                  selectedModifier,
                )
                  ? slot.modifierId
                  : null;

              onChange({
                ...slot,

                mineralId: nextMineralId,

                modifierId: nextModifierId,
              });
            }}
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
            value={slot.modifierId ?? ""}
            onChange={(e) =>
              onChange({
                ...slot,
                modifierId: e.target.value || null,
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
            <StatBadge key={statKey} statKey={statKey} />
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
