import { test } from "node:test";
import assert from "node:assert/strict";
import { move } from "../engine/geo.ts";
import { QuestRunner } from "./runner.ts";
import { resolveQuest } from "./schema.ts";
import type { Quest, QuestRunnerEvent } from "./types.ts";

const A = { id: "a", name: "А", lat: 43.1155, lon: 131.8855 };
const B = { id: "b", name: "Б", ...move(A, 90, 100) };
const C = { id: "c", name: "В", ...move(A, 90, 200) };
const points = new Map([[A.id, A], [B.id, B], [C.id, C]]);
const point = (id: string) => points.get(id);

function quest(steps: unknown[]): Quest {
  return resolveQuest({ id: "q1", title: "Тест", start: "a", steps }, point);
}

function runner() {
  const events: QuestRunnerEvent[] = [];
  const saves: unknown[] = [];
  return {
    events,
    saves,
    value: new QuestRunner({ emit: (event) => events.push(event), save: (state) => saves.push(state) }),
  };
}

test("схема: разрешает старые и новые шаги, visit принимает placeId", () => {
  const q = quest([
    { type: "goto", poi: "a" },
    { type: "hold", poi: "a", seconds: 10 },
    { type: "tail", from: "a", to: "b" },
    { type: "collect", pois: ["a", "b"] },
    { type: "explore", cells: 12 },
    { type: "listen", poi: "a", audio: "audio/test.mp3" },
    { type: "quiz", question: "Вопрос", answers: ["А", "Б", "В"], correct: 1 },
    { type: "look", poi: "a", prompt: "Найди знак" },
    { type: "visit", placeId: "b" },
  ]);
  assert.deepEqual(q.steps.map((s) => s.type), ["goto", "hold", "tail", "collect", "explore", "listen", "quiz", "look", "visit"]);
  assert.equal(q.steps[8].type === "visit" && q.steps[8].place.id, "b");
});

test("схема: отклоняет неверный quiz и неизвестную точку", () => {
  assert.throws(() => quest([{ type: "quiz", answers: ["А", "Б"], correct: 0 }]));
  assert.throws(() => quest([{ type: "goto", poi: "missing" }]), /Неизвестная точка/);
});

test("goto, hold и collect завершаются от координат и времени", () => {
  const { value, events } = runner();
  value.start(quest([
    { id: "go", type: "goto", poi: "a", radius: 20 },
    { id: "wait", type: "hold", poi: "b", radius: 20, seconds: 5 },
    { id: "take", type: "collect", pois: ["b", "c"], radius: 20 },
  ]), { position: move(A, 270, 50) });

  value.updatePosition(A);
  assert.equal(value.active?.step.type, "hold");
  value.updatePosition(B);
  value.tick(3);
  value.updatePosition(move(B, 0, 30));
  value.tick(3);
  assert.equal(value.active?.runtime.holdSeconds, 0);
  value.updatePosition(B);
  value.tick(5);
  assert.equal(value.active?.step.type, "collect");
  value.updatePosition(C);
  assert.equal(value.active, null);
  assert.equal(events.filter((e) => e.type === "stepDone").length, 3);
  assert.equal(events.at(-1)?.type, "questDone");
});

test("explore считает только новые ячейки после начала шага", () => {
  const { value } = runner();
  value.start(quest([{ type: "explore", cells: 3 }]), { fogCells: 100 });
  value.updateFog(102);
  assert.ok(value.active);
  value.updateFog(103);
  assert.equal(value.active, null);
});

test("listen и look требуют геотриггер до подтверждения", () => {
  const { value } = runner();
  value.start(quest([
    { type: "listen", poi: "a", radius: 30, audio: "audio/test.mp3" },
    { type: "look", poi: "b", radius: 30, prompt: "Найди якорь" },
  ]), { position: move(A, 0, 50) });

  assert.throws(() => value.completeListen(), /Сначала подойдите/);
  value.updatePosition(A);
  assert.equal(value.active?.runtime.audioReady, true);
  value.completeListen();
  assert.throws(() => value.confirmLook(), /Сначала подойдите/);
  value.updatePosition(B);
  value.confirmLook();
  assert.equal(value.active, null);
});

test("quiz завершается только правильным ответом", () => {
  const { value } = runner();
  value.start(quest([{ type: "quiz", question: "?", answers: ["0", "1", "2"], correct: 2 }]));
  assert.deepEqual(value.answerQuiz(1), { correct: false });
  assert.ok(value.active);
  assert.deepEqual(value.answerQuiz(2), { correct: true });
  assert.equal(value.active, null);
});

test("goto с timeLimit проваливает квест", () => {
  const { value, events } = runner();
  value.start(quest([{ type: "goto", poi: "b", timeLimit: 5 }]), { position: A });
  value.tick(6);
  assert.equal(value.active, null);
  assert.deepEqual(events.at(-1), { type: "questFailed", questId: "q1", reason: "Не успел" });
});

test("снимок восстанавливает активный шаг", () => {
  const first = runner().value;
  first.start(quest([{ type: "hold", poi: "a", seconds: 10 }]), { position: A });
  first.tick(4);
  const snapshot = first.snapshotForSave();
  assert.ok(snapshot);

  const second = runner().value;
  second.restore(snapshot!, { position: A });
  second.tick(6);
  assert.equal(second.active, null);
});

test("tail проходит маршрут при безопасной дистанции", () => {
  const { value } = runner();
  const q = quest([{ type: "tail", from: "a", to: "b", speed: 10, startRadius: 150, loseDistance: 170, minDistance: 5 }]);
  value.start(q, { position: move(A, 270, 20) });
  for (let i = 0; i < 11 && value.active; i++) {
    value.updatePosition(move(A, 90, Math.max(0, i * 10 - 20)));
    value.tick(1);
  }
  assert.equal(value.active, null);
});
