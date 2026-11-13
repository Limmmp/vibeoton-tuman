import { test } from "node:test";
import assert from "node:assert/strict";
import { demoPoint, movementStep, simSpeed } from "./simulation.ts";

test("скорость меняет только длину шага и сохраняет Shift-ускорение", () => {
  assert.equal(movementStep(1, 1), 1.5);
  assert.equal(movementStep(1, 8), 12);
  assert.equal(movementStep(1, 32), 48);
  assert.equal(movementStep(1, 8, true), 48);
  assert.equal(movementStep(-1, 8), 0);
  for (const value of [NaN, Infinity, 0, -1, 65]) assert.throws(() => simSpeed(value));
});

test("телепорт отклоняет пустые, бесконечные и внепроекционные координаты", () => {
  assert.deepEqual(demoPoint({ lat: 43.1, lon: 131.9 }), { lat: 43.1, lon: 131.9 });
  for (const point of [{ lat: NaN, lon: 0 }, { lat: 0, lon: Infinity }, { lat: 86, lon: 0 }, { lat: 0, lon: -181 }]) assert.throws(() => demoPoint(point));
});
