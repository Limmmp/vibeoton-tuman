import { resolveQuest } from "./schema.ts";
import type { Quest, QuestSnapshot } from "./types.ts";
import { STORY_QUESTS } from "./story.ts";
export { QUEST_REQUIRES } from "./story.ts";

// Координаты и названия совпадают с public/models/landmarks/manifest.json.
// Они остаются непроверенными ориентирами каталога, исторических утверждений здесь нет.
const s56 = { id: "s56", name: "Подлодка С-56", lat: 43.113375, lon: 131.891218 };
const funicular = { id: "funicular", name: "Фуникулёр", lat: 43.115812, lon: 131.900883 };
export const LANDMARK_QUEST: Quest = resolveQuest({
  id: "landmarks-two", title: "Две фигурки города", giver: "Исследователь", start: s56,
  intro: "Посети подлодку С-56 и нижнюю станцию фуникулёра. Обе фигурки можно рассмотреть во вкладке «Награды».",
  reward: { xp: 200, cash: 100, items: [] },
  steps: [
    { id: "reach-s56", type: "goto", poi: s56, radius: 35, text: "Доберись до подлодки С-56" },
    { id: "reach-funicular", type: "goto", poi: funicular, radius: 35, text: "Доберись до нижней станции фуникулёра" },
  ],
  outro: ["Обе точки посещены. Открой «Награды», чтобы рассмотреть их 3D-модели."],
}, undefined, "https://www.openstreetmap.org/way/30281940");

export const QUEST_CATALOG: readonly Quest[] = [...STORY_QUESTS, LANDMARK_QUEST];
export function questById(id: string): Quest | undefined {
  return QUEST_CATALOG.find(quest => quest.id === id);
}

/** Старые сохранения не должны возвращать удалённые задания, ожидание и таймеры. */
export function currentQuestSnapshot(saved: QuestSnapshot): QuestSnapshot | null {
  const quest = questById(saved.quest.id);
  if (!quest) return null;
  const stepId = saved.quest.steps[saved.stepIndex]?.id;
  const matching = quest.steps.findIndex(step => step.id === stepId);
  const stepIndex = matching >= 0 ? matching : Math.min(saved.stepIndex, quest.steps.length - 1);
  return { ...saved, quest, stepIndex, runtime: { elapsed: 0 } };
}
