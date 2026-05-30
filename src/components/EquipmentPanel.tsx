import { Lock, Unlock } from "lucide-react";

import pans from "../data/pans.json";
import shovels from "../data/shovels.json";
import rings from "../data/rings.json";
import necklaces from "../data/necklaces.json";
import charms from "../data/charms.json";
import mutations from "../data/mutations.json";
import enchants from "../data/enchants.json";

import EquipmentSelector from "./EquipmentSelector";
import MutationSelector from "./MutationSelector";
import EnchantSelector from "./EnchantSelector";
import PermanentBuffsPanel from "./PermanentBuffsPanel";
import ConsumablesPanel from "./ConsumablesPanel";

import type { EquipmentItem } from "../engine/types";
import type { AccessSettings } from "../access/accessTypes";
import type { LockedSlots } from "../optimizer/types";
import type { PermanentBuffsState } from "./PermanentBuffsPanel";
import type { ConsumablesState } from "./ConsumablesPanel";

import { filterAvailableRings } from "../helpers/filterAvailableRings";
import { areMutationsAccessible, isItemAccessible } from "../access/accessRules";

const typedPans: EquipmentItem[] = pans;
const typedShovels: EquipmentItem[] = shovels;
const typedRings: EquipmentItem[] = rings;
const typedNecklaces: EquipmentItem[] = necklaces;
const typedCharms: EquipmentItem[] = charms;

interface Props {
  accessSettings: AccessSettings;
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
  permanentBuffs: PermanentBuffsState;
  setPermanentBuffs: React.Dispatch<React.SetStateAction<PermanentBuffsState>>;
  selectedConsumables: ConsumablesState;
  setSelectedPan: (value: string | null) => void;
  setSelectedPanEnchant: (value: string | null) => void;
  setSelectedShovel: (value: string | null) => void;
  setSelectedNecklace: (value: string | null) => void;
  setSelectedNecklaceMutation: (value: string | null) => void;
  setSelectedCharm: (value: string | null) => void;
  setSelectedCharmMutation: (value: string | null) => void;
  updateRing: (index: number, value: string | null) => void;
  updateRingMutation: (index: number, value: string | null) => void;
  toggleConsumable: (category: keyof ConsumablesState, id: string) => void;
  lockedSlots:LockedSlots;
  setLockedSlots: React.Dispatch<
    React.SetStateAction<LockedSlots>
  >;
}

function includeSelectedItem<T extends EquipmentItem>(
  accessibleItems: T[],
  allItems: T[],
  selectedId: string | null,
): T[] {
  if (!selectedId) {
    return accessibleItems;
  }

  if (accessibleItems.some((item) => item.id === selectedId)) {
    return accessibleItems;
  }

  const selectedItem = allItems.find((item) => item.id === selectedId);

  if (!selectedItem) {
    return accessibleItems;
  }

  return [
    selectedItem,
    ...accessibleItems,
  ];
}

export default function EquipmentPanel(props: Props) {
  const visibleRings = props.selectedRings.slice(0, props.ringSlotLimit);

  const mutationsAccessible =
    areMutationsAccessible(props.accessSettings);

  const accessiblePans = includeSelectedItem(
    typedPans.filter((item) =>
      isItemAccessible(item as any, props.accessSettings)
    ),
    typedPans,
    props.selectedPan,
  );

  const accessibleShovels = includeSelectedItem(
    typedShovels.filter((item) =>
      isItemAccessible(item as any, props.accessSettings)
    ),
    typedShovels,
    props.selectedShovel,
  );

  const accessibleNecklaces = includeSelectedItem(
    typedNecklaces.filter((item) =>
      isItemAccessible(item as any, props.accessSettings)
    ),
    typedNecklaces,
    props.selectedNecklace,
  );

  const accessibleCharms = includeSelectedItem(
    typedCharms.filter((item) =>
      isItemAccessible(item as any, props.accessSettings)
    ),
    typedCharms,
    props.selectedCharm,
  );

  const accessibleRings = typedRings.filter((item) =>
    isItemAccessible(item as any, props.accessSettings)
  );
  
  const accessibleMutations =
    props.accessSettings.includeLimitedTime
      ? mutations
      : mutations.filter((mutation) => !mutation.limitedTime);

  return (
    <section className="bg-slate-800 rounded-2xl p-4 shadow-lg space-y-4 text-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Equipment</h2>
        <div className="flex items-center gap-2 bg-slate-700 rounded-xl p-1">
          <button
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${props.ringSlotLimit === 6 ? "bg-indigo-600 text-white" : "text-slate-300"}`}
            onClick={() => props.setRingSlotLimit(6)}
          >
            6 Rings
          </button>

          <button
            className={`px-3 py-1 rounded-lg text-sm font-semibold transition ${props.ringSlotLimit === 8 ? "bg-indigo-600 text-white" : "text-slate-300"}`}
            onClick={() => props.setRingSlotLimit(8)}
          >
            8 Rings
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
          <button
            onClick={() =>
              props.setLockedSlots((prev) => ({
                ...prev,
                pan: !prev.pan,
              }))
            }
            className={
              props.lockedSlots.pan
                ? "bg-yellow-500 text-black rounded w-10 h-10 flex items-center justify-center"
                : "bg-slate-700 rounded w-10 h-10 flex items-center justify-center"
            }
          >
            {props.lockedSlots.pan ? <Lock size={14} /> : <Unlock size={14} />}
          </button>

          <EquipmentSelector
            label="Pan"
            items={accessiblePans}
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
      </div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
        <button
          onClick={() =>
            props.setLockedSlots((prev) => ({
              ...prev,
              shovel: !prev.shovel,
            }))
          }
          className={
            props.lockedSlots.shovel
              ? "bg-yellow-500 text-black rounded w-10 h-10 flex items-center justify-center"
              : "bg-slate-700 rounded w-10 h-10 flex items-center justify-center"
          }
        >
          {props.lockedSlots.shovel ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <EquipmentSelector
          label="Shovel"
          items={accessibleShovels}
          value={props.selectedShovel}
          getName={(item) => item.name}
          onChange={props.setSelectedShovel}
        />
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
        <button
          onClick={() =>
            props.setLockedSlots((prev) => ({
              ...prev,
              necklace: !prev.necklace,
            }))
          }
          className={
            props.lockedSlots.necklace
              ? "bg-yellow-500 text-black rounded w-10 h-10 flex items-center justify-center"
              : "bg-slate-700 rounded w-10 h-10 flex items-center justify-center"
          }
        >
          {props.lockedSlots.necklace ? (
            <Lock size={14} />
          ) : (
            <Unlock size={14} />
          )}
        </button>

        <EquipmentSelector
          label="Necklace"
          items={accessibleNecklaces}
          value={props.selectedNecklace}
          getName={(item) => item.name}
          onChange={props.setSelectedNecklace}
        />

        <MutationSelector
          label="Necklace Mutation"
          mutations={accessibleMutations}
          value={props.selectedNecklaceMutation}
          disabled={!mutationsAccessible}
          disabledMessage="Unlocks at Snowy Mountain"
          onChange={props.setSelectedNecklaceMutation}
        />
      </div>

      <div className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end">
        <button
          onClick={() =>
            props.setLockedSlots((prev) => ({
              ...prev,
              charm: !prev.charm,
            }))
          }
          className={
            props.lockedSlots.charm
              ? "bg-yellow-500 text-black rounded w-10 h-10 flex items-center justify-center"
              : "bg-slate-700 rounded w-10 h-10 flex items-center justify-center"
          }
        >
          {props.lockedSlots.charm ? <Lock size={14} /> : <Unlock size={14} />}
        </button>

        <EquipmentSelector
          label="Charm"
          items={accessibleCharms}
          value={props.selectedCharm}
          getName={(item) => item.name}
          onChange={props.setSelectedCharm}
        />

        <MutationSelector
          label="Charm Mutation"
          mutations={accessibleMutations}
          value={props.selectedCharmMutation}
          disabled={!mutationsAccessible}
          disabledMessage="Unlocks at Snowy Mountain"
          onChange={props.setSelectedCharmMutation}
        />
      </div>

      <div className="pt-3 border-t border-slate-700">
        <div className="space-y-2">
          {visibleRings.map((value, index) => {
            const accessibleRingsForSlot = includeSelectedItem(
              accessibleRings,
              typedRings,
              value,
            );

            const availableRings = filterAvailableRings(
              accessibleRingsForSlot,
              props.selectedRings,
              index,
            );
            return (
              <div
                key={index}
                className="grid grid-cols-[auto_1fr_1fr] gap-4 items-end"
              >
                <button
                  onClick={() =>
                    props.setLockedSlots((prev) => {
                      const nextRings = [...prev.rings];
                      nextRings[index] = !nextRings[index];
                      return {
                        ...prev,
                        rings: nextRings,
                      };
                    })
                  }
                  className={
                    props.lockedSlots.rings[index]
                      ? "bg-yellow-500 text-black rounded w-10 h-10 flex items-center justify-center"
                      : "bg-slate-700 rounded w-10 h-10 flex items-center justify-center"
                  }
                >
                  {props.lockedSlots.rings[index] ? (
                    <Lock size={14} />
                  ) : (
                    <Unlock size={14} />
                  )}
                </button>

                <EquipmentSelector
                  label={`Ring ${index + 1}`}
                  items={availableRings}
                  value={value}
                  getName={(item) => item.name}
                  getId={(item) => item.id}
                  onChange={(newValue) => props.updateRing(index, newValue)}
                />

                <MutationSelector
                  label={`Ring ${index + 1} Mutation`}
                  mutations={accessibleMutations}
                  value={props.selectedRingMutations[index]}
                  disabled={!mutationsAccessible}
                  disabledMessage="Unlocks at Snowy Mountain"
                  onChange={(newValue) =>
                    props.updateRingMutation(index, newValue)
                  }
                />
              </div>
            );
          })}
        </div>
      </div>


      <PermanentBuffsPanel
        accessSettings={props.accessSettings}
        permanentBuffs={props.permanentBuffs}
        setPermanentBuffs={props.setPermanentBuffs}
      />

      <ConsumablesPanel
        selectedConsumables={props.selectedConsumables}
        toggleConsumable={props.toggleConsumable}
      />
    </section>
  );
}
