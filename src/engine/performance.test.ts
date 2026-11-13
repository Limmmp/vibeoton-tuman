import { test } from "node:test";
import assert from "node:assert/strict";
import { profileFor } from "./performance.ts";

test("low отключает 3D-дома и снижает стоимость тумана", () => {
  const low = profileFor("low", true, 3);
  assert.equal(low.pixelRatio, 1);
  assert.equal(low.fogMaxCanvas, 960);
  assert.equal(low.fogIntervalMs, 330);
  assert.equal(low.buildingLimit, 0);
  assert.equal(low.show3dBuildings, false);
  assert.equal(low.pitch3d, 40);
});

test("balanced на телефоне ограничивает рендер, но оставляет дома", () => {
  const balanced = profileFor("balanced", true, 3);
  assert.equal(balanced.pixelRatio, 1.5);
  assert.equal(balanced.buildingLimit, 3000);
  assert.equal(balanced.show3dBuildings, true);
});

test("high сохраняет полный профиль", () => {
  const high = profileFor("high", false, 3);
  assert.equal(high.pixelRatio, 2);
  assert.equal(high.fogMaxCanvas, 2048);
  assert.equal(high.buildingLimit, 8000);
  assert.equal(high.pitch3d, 60);
});
