import type {
  BuildState,
  ConsumablesState,
  MuseumSlotSelection,
  PermanentBuffsState,
} from "./types";

export interface CreateBuildStateParams {
  selectedPan: string | null;
  selectedPanEnchant: string | null;

  selectedShovel: string | null;

  selectedNecklace: string | null;
  selectedNecklaceMutation: string | null;

  selectedCharm: string | null;
  selectedCharmMutation: string | null;

  selectedRings: Array<string | null>;
  selectedRingMutations: Array<string | null>;

  permanentBuffs?: PermanentBuffsState;
  selectedConsumables?: ConsumablesState;

  museumSlots: MuseumSlotSelection[];
}

export function createBuildState({
  selectedPan,
  selectedPanEnchant,

  selectedShovel,

  selectedNecklace,
  selectedNecklaceMutation,

  selectedCharm,
  selectedCharmMutation,

  selectedRings,
  selectedRingMutations,

  permanentBuffs,
  selectedConsumables,

  museumSlots,
}: CreateBuildStateParams): BuildState {
  return {
    panId: selectedPan ?? null,

    panEnchantId: selectedPanEnchant ?? null,

    shovelId: selectedShovel ?? null,

    necklaceId: selectedNecklace ?? null,

    necklaceMutationId: selectedNecklaceMutation ?? null,

    charmId: selectedCharm ?? null,

    charmMutationId: selectedCharmMutation ?? null,


    museumSlots: museumSlots ?? [],

    permanentBuffs,
    selectedConsumables,

    rings: selectedRings.map((ringId, index) => ({
      ringId: ringId ?? null,
      mutationId: selectedRingMutations[index] ?? null,
    })),
  };
}
