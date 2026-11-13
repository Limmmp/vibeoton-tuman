import { resolveQuest } from "./schema";
import type { Quest } from "./types";

// Технический квест для проверки движка и WebView-контракта.
// Точки взяты из data/places.json. Исторических утверждений здесь нет:
// места пока не проверены человеком и используются только как координатные ориентиры.
export const ENGINE_DEMO_QUEST: Quest = resolveQuest({
  id: "engine-demo-center",
  title: "Проверка квестового движка",
  giver: "Кот Адмирал",
  intro: "Короткий маршрут проверяет геотриггеры, ожидание, сбор, вопрос и ручное подтверждение.",
  outro: ["Все основные механики квеста работают."],
  reward: { xp: 150, cash: 100, rep: 1, items: ["admiral-cap"] },
  start: {
    id: "osm-w30281940",
    name: "С-56",
    lat: 43.113375,
    lon: 131.891218,
  },
  steps: [
    {
      id: "reach-s56",
      type: "goto",
      poi: { id: "osm-w30281940", name: "С-56", lat: 43.113375, lon: 131.891218 },
      radius: 35,
      text: "Подойди к С-56.",
    },
    {
      id: "hold-square",
      type: "hold",
      poi: { id: "osm-w26687466", name: "Адмиральский сквер", lat: 43.113976, lon: 131.891466 },
      radius: 35,
      seconds: 8,
      text: "Остановись в Адмиральском сквере на 8 секунд.",
    },
    {
      id: "collect-nearby",
      type: "collect",
      pois: [
        { id: "osm-w170639233", name: "Красный вымпел", lat: 43.11255, lon: 131.89053 },
        { id: "osm-n5775725154", name: "Музей Города", lat: 43.11368, lon: 131.892833 },
      ],
      radius: 35,
      text: "Посети две соседние точки.",
    },
    {
      id: "listen-test",
      type: "listen",
      poi: { id: "osm-w27532893", name: "Дом офицеров флота", lat: 43.114476, lon: 131.890864 },
      radius: 30,
      audio: "demo://quest-audio",
      text: "Подойди к точке и запусти тестовый аудиофрагмент.",
    },
    {
      id: "quiz-test",
      type: "quiz",
      question: "Сколько точек было в шаге сбора?",
      answers: ["Одна", "Две", "Три"],
      correct: 1,
      text: "Ответь на вопрос о пройденном шаге.",
    },
    {
      id: "look-test",
      type: "look",
      poi: { id: "osm-w27420195", name: "Театральный сквер", lat: 43.114951, lon: 131.893113 },
      radius: 30,
      prompt: "Осмотрись вокруг и подтверди, что нашёл точку.",
      text: "Дойди до Театрального сквера и осмотрись.",
    },
    {
      id: "visit-test",
      type: "visit",
      place: { id: "osm-w26537156", name: "Приморский драматический театр имени Максима Горького", lat: 43.115961, lon: 131.893486 },
      radius: 35,
      text: "Заверши маршрут у театра.",
    },
  ],
}, undefined, "demo");

export const QUEST_CATALOG: readonly Quest[] = [ENGINE_DEMO_QUEST];

export function questById(id: string): Quest | undefined {
  return QUEST_CATALOG.find((quest) => quest.id === id);
}
