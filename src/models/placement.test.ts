import { test } from "node:test";
import assert from "node:assert/strict";
import { overlapsLandmark } from "./placement.ts";

const point = { id: "test", lat: 43, lon: 132, buildingClearanceMeters: 10 };
const ring = (west: number, south: number, east: number, north: number) => [
  [132 + west / (111320 * Math.cos(43 * Math.PI / 180)), 43 + south / 111320],
  [132 + east / (111320 * Math.cos(43 * Math.PI / 180)), 43 + south / 111320],
  [132 + east / (111320 * Math.cos(43 * Math.PI / 180)), 43 + north / 111320],
  [132 + west / (111320 * Math.cos(43 * Math.PI / 180)), 43 + north / 111320],
  [132 + west / (111320 * Math.cos(43 * Math.PI / 180)), 43 + south / 111320],
];

test("дубликат здания удаляется даже при далёкой первой вершине", () => {
  assert.equal(overlapsLandmark([ring(-100, -100, 100, 100)], point), true);
  assert.equal(overlapsLandmark([ring(8, -80, 20, 80)], point), true);
  assert.equal(overlapsLandmark([ring(30, 30, 40, 40)], point), false);
});

test("далёкие дома и большой двор вокруг модели сохраняются", () => {
  assert.equal(overlapsLandmark([ring(-100, -100, 100, 100), ring(-40, -40, 40, 40)], point), false);
  assert.equal(overlapsLandmark([ring(-100, -100, 100, 100), ring(-5, -5, 5, 5)], point), true);
  assert.equal(overlapsLandmark([ring(-1, -1, 1, 1)], { ...point, buildingClearanceMeters: 0 }), false);
});
