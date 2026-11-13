// Тесты слоя других игроков. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { playersGeoJSON, validatePlayer, visiblePlayers, type OtherPlayer } from "./players.ts";

const players: OtherPlayer[] = [
  { id: "a", lat: 43.11, lon: 131.88, name: "Аня", relation: "party" },
  { id: "p", lat: 43.11, lon: 131.88, name: "Петя", relation: "friend" },
  { id: "x", lat: 43.11, lon: 131.88, relation: "public" },
];

test("игроки: режимы видимости off / party / friends / all", () => {
  assert.equal(visiblePlayers(players, "off").length, 0);
  assert.deepEqual(visiblePlayers(players, "party").map((p) => p.id), ["a"]);
  assert.deepEqual(visiblePlayers(players, "friends").map((p) => p.id), ["a", "p"]);
  assert.equal(visiblePlayers(players, "all").length, 3);
});

test("игроки: приоритет и инициал в данных слоя", () => {
  const f = playersGeoJSON(players).features.map((x) => x.properties!);
  assert.deepEqual(f.map((x) => x.priority), [3, 2, 1]);
  assert.deepEqual(f.map((x) => x.initial), ["А", "П", "?"]);
  assert.equal(f[0].party, 1);
});

test("игроки: проверка входа", () => {
  assert.equal(validatePlayer(players[0]), null);
  assert.match(validatePlayer({ id: "b", lat: NaN, lon: 1, relation: "party" })!, /нет координат/);
  assert.match(validatePlayer({ id: "c", lat: 1, lon: 1, relation: "boss" as never })!, /неизвестное отношение/);
});
