import { load, save } from "../engine/storage";
import { EMPTY_PROGRESS, type ProgressSave } from "./progress";

const PROGRESS_KEY = "progress";

export function loadProgress(): ProgressSave {
  return load<ProgressSave>(PROGRESS_KEY, EMPTY_PROGRESS);
}

export function saveProgress(state: ProgressSave): boolean {
  return save(PROGRESS_KEY, state);
}
