import { QUEST_STEP_TYPES, type Quest, type QuestPoint, type QuestStep } from "./types.ts";

export type PointResolver = (id: string) => QuestPoint | undefined;

type Raw = Record<string, unknown>;

export function resolveQuest(input: unknown, resolvePoint?: PointResolver, source = "app"): Quest {
  const raw = object(input, "Квест не объект");
  const title = text(raw.title);
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  if (!title || !rawSteps.length) throw new Error("Нет title или steps");

  const steps = rawSteps.map((value, index) => resolveStep(object(value, `Шаг ${index}: не объект`), index, resolvePoint));
  const start = raw.start ? point(raw.start, resolvePoint) : firstPoint(steps);
  if (!start) throw new Error("Не определена точка выдачи");

  return {
    id: text(raw.id) || `${source}-${Date.now().toString(36)}`,
    ...(text(raw.storyId) ? { storyId: text(raw.storyId) } : {}),
    source,
    title: title.slice(0, 80),
    giver: (text(raw.giver) || "Незнакомец").slice(0, 40),
    intro: text(raw.intro),
    outro: lines(raw.outro),
    reward: {
      cash: clamp(Math.round(number(objectOrEmpty(raw.reward).cash) || 300), 0, 50_000),
      rep: clamp(Math.round(number(objectOrEmpty(raw.reward).rep) || 1), 0, 10),
    },
    start,
    steps,
  };
}

function resolveStep(raw: Raw, index: number, resolvePoint?: PointResolver): QuestStep {
  const type = text(raw.type);
  if (!(QUEST_STEP_TYPES as readonly string[]).includes(type)) throw new Error(`Шаг ${index}: неизвестный тип ${type}`);
  const base = { id: text(raw.id) || `step-${index + 1}`, text: text(raw.text), say: lines(raw.say) };

  switch (type) {
    case "goto":
      return { ...base, type, poi: point(raw.poi, resolvePoint), radius: positive(raw.radius, 35), ...(number(raw.timeLimit) > 0 ? { timeLimit: number(raw.timeLimit) } : {}) };
    case "hold":
      return { ...base, type, poi: point(raw.poi, resolvePoint), radius: positive(raw.radius, 35), seconds: clamp(positive(raw.seconds, 20), 5, 600) };
    case "tail":
      return {
        ...base, type, from: point(raw.from, resolvePoint), to: point(raw.to, resolvePoint), speed: positive(raw.speed, 1.3),
        startRadius: positive(raw.startRadius, 150), warnDistance: positive(raw.warnDistance, 120),
        loseDistance: positive(raw.loseDistance, 170), minDistance: positive(raw.minDistance, 12), path: path(raw.path),
      };
    case "collect": {
      const pois = Array.isArray(raw.pois) ? raw.pois.map((p) => point(p, resolvePoint)) : [];
      if (!pois.length) throw new Error(`Шаг ${index}: пустой collect`);
      return { ...base, type, pois, radius: positive(raw.radius, 30) };
    }
    case "explore":
      return { ...base, type, cells: clamp(positive(raw.cells, 50), 1, 2000) };
    case "listen": {
      const audio = text(raw.audio);
      if (!audio) throw new Error(`Шаг ${index}: нет audio`);
      return { ...base, type, poi: point(raw.poi, resolvePoint), radius: positive(raw.radius, 30), audio };
    }
    case "quiz": {
      const answers = Array.isArray(raw.answers) ? raw.answers.map(text) : [];
      const correct = number(raw.correct);
      if (answers.length !== 3 || answers.some((a) => !a)) throw new Error(`Шаг ${index}: quiz требует 3 варианта`);
      if (![0, 1, 2].includes(correct)) throw new Error(`Шаг ${index}: неверный correct`);
      return { ...base, type, question: text(raw.question) || base.text, answers: answers as [string, string, string], correct: correct as 0 | 1 | 2 };
    }
    case "look":
      return { ...base, type, poi: point(raw.poi, resolvePoint), radius: positive(raw.radius, 30), prompt: text(raw.prompt) || base.text };
    case "visit":
      return { ...base, type, place: point(raw.place ?? raw.placeId, resolvePoint), radius: positive(raw.radius, 30) };
    default:
      throw new Error(`Шаг ${index}: неизвестный тип ${type}`);
  }
}

function point(value: unknown, resolvePoint?: PointResolver): QuestPoint {
  if (typeof value === "string") {
    const found = resolvePoint?.(value);
    if (!found) throw new Error(`Неизвестная точка: ${value}`);
    return found;
  }
  const raw = object(value, "Точка не объект");
  const lat = number(raw.lat), lon = number(raw.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error(`Неверные координаты точки: ${text(raw.id)}`);
  return { id: text(raw.id) || `${lat}:${lon}`, name: text(raw.name) || text(raw.id) || "Точка", lat, lon };
}

function firstPoint(steps: QuestStep[]): QuestPoint | undefined {
  const first = steps[0];
  if (!first) return;
  if ("poi" in first) return first.poi;
  if (first.type === "tail") return first.from;
  if (first.type === "collect") return first.pois[0];
  if (first.type === "visit") return first.place;
}

function path(value: unknown) {
  if (value == null) return undefined;
  if (!Array.isArray(value) || value.length < 2) throw new Error("tail path требует минимум 2 точки");
  return value.map((p) => {
    const raw = object(p, "Точка path не объект");
    return { lat: number(raw.lat), lon: number(raw.lon) };
  });
}

function object(value: unknown, message: string): Raw {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Raw;
}
const objectOrEmpty = (value: unknown): Raw => value && typeof value === "object" && !Array.isArray(value) ? value as Raw : {};
const text = (value: unknown) => value == null ? "" : String(value).trim();
const lines = (value: unknown) => (Array.isArray(value) ? value : value ? [value] : []).map(text).filter(Boolean);
const number = (value: unknown) => value === "" || value == null ? Number.NaN : Number(value);
const positive = (value: unknown, fallback: number) => number(value) > 0 ? number(value) : fallback;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
