import { BuildState } from "../engine/types";

export function buildHash(build: BuildState) {
  return JSON.stringify(build);
}
