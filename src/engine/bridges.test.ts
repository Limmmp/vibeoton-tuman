// Тесты поправки высот на мостах. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { BridgeIndex, flattenBridges } from "./bridges.ts";

test("мосты: точка на оси моста — «на мосту», в 50 м сбоку — нет", () => {
  const idx = new BridgeIndex([{ id: 1, name: "Тест", len: 800, line: [[131.89, 43.11], [131.90, 43.11]] }]);
  assert.equal(idx.isOnBridge({ lat: 43.11, lon: 131.895 }), true);
  assert.equal(idx.isOnBridge({ lat: 43.11045, lon: 131.895 }), false); // ~50 м к северу
  assert.equal(idx.isOnBridge({ lat: 43.11, lon: 131.91 }), false); // за концом моста
});

test("мосты: провал до уровня воды заменяется прямой между берегами", () => {
  // Берег 20 м → над водой тайлы дают 0 м → другой берег 30 м.
  const h = [20, 20, 0, 0, 0, 30, 30];
  const on = [false, false, true, true, true, false, false];
  const d = [0, 10, 20, 30, 40, 50, 60];
  const flat = flattenBridges(h, on, d);
  assert.deepEqual(flat.map((x) => Math.round(x)), [20, 20, 23, 25, 28, 30, 30]);
  // Без поправки подъём был бы 30 м и спуск 20 м, с поправкой — только 10 м подъёма.
  let climb = 0, descent = 0;
  for (let i = 1; i < flat.length; i++) { const dh = flat[i] - flat[i - 1]; if (dh > 0) climb += dh; else descent -= dh; }
  assert.equal(Math.round(climb), 10);
  assert.equal(Math.round(descent), 0);
});
