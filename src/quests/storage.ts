import { load, save } from "../engine/storage";
import type { QuestSnapshot } from "./types";

const ACTIVE_QUEST_KEY = "quest-active";

export function loadQuestSnapshot(): QuestSnapshot | null {
  return load<QuestSnapshot | null>(ACTIVE_QUEST_KEY, null);
}

export function saveQuestSnapshot(snapshot: QuestSnapshot | null): boolean {
  return save(ACTIVE_QUEST_KEY, snapshot);
}
