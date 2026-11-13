import { load, save } from "../engine/storage";
import { EMPTY_PROGRESS } from "./progress";
import type { ProgressState } from "./types";

const PROGRESS_KEY = "progress";

export function loadProgress(): ProgressState {
  return load<ProgressState>(PROGRESS_KEY, EMPTY_PROGRESS);
}

export function saveProgress(state: ProgressState): boolean {
  return save(PROGRESS_KEY, state);
}
