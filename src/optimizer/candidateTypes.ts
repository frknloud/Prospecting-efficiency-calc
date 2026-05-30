import { BuildState } from "../engine/types";

export interface UpgradeCandidate {
  slot: string;

  previousItemId?: string;

  newItemId?: string;

  mutationId?: string | null;

  enchantId?: string | null;

  build: BuildState;

  label: string;
}
