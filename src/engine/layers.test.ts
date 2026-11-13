// Тесты слоёв меток. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { layerOfKind, normalizeLayers, visiblePlaces } from "./layers.ts";

const places = [
  { id: "q", lat: 0, lon: 0, kind: "quest" },
  { id: "lib", lat: 0, lon: 0, kind: "study" },
  { id: "art", lat: 0, lon: 0, kind: "creative" },
  { id: "cafe", lat: 0, lon: 0, kind: "food" },
  { id: "park", lat: 0, lon: 0, kind: "outdoor" },
  { id: "museum", lat: 0, lon: 0, kind: "culture" },
  { id: "concert", lat: 0, lon: 0, kind: "event" },
  { id: "noKind", lat: 0, lon: 0 },
];

test("слои: тип места → категория меню «Слои»", () => {
  assert.equal(layerOfKind("quest"), "quests");
  assert.equal(layerOfKind("creative"), "study");
  assert.equal(layerOfKind("outdoor"), "leisure");
  assert.equal(layerOfKind("history"), "history");
  assert.equal(layerOfKind("event"), "events");
  assert.equal(layerOfKind(undefined), "leisure");
});

test("слои: видны только места включённых категорий", () => {
  assert.deepEqual(visiblePlaces(places, ["quests"]).map((p) => p.id), ["q"]);
  assert.deepEqual(visiblePlaces(places, ["study", "history"]).map((p) => p.id), ["lib", "art", "museum"]);
  assert.equal(visiblePlaces(places, []).length, 0);
});

test("слои: проверка входа — неизвестный слой ошибка, повторы убираются, порядок стабильный", () => {
  assert.deepEqual(normalizeLayers(["events", "quests", "quests"]), ["quests", "events"]);
  assert.throws(() => normalizeLayers(["quests", "food"]), /Неизвестные слои: food/);
});
