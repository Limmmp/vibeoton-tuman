import { test } from "node:test";
import assert from "node:assert/strict";
import { levelProgress } from "./level.ts";

test("шкала опыта заполняется внутри уровня и сбрасывается на пороге", () => {
  assert.equal(levelProgress(50).fraction, 0.5);
  assert.deepEqual([levelProgress(100).level, levelProgress(100).fraction], [2, 0]);
  assert.equal(levelProgress(250).fraction, 0.5);
  assert.deepEqual([levelProgress(400).level, levelProgress(400).fraction], [3, 0]);
  for (const xp of [-10, NaN, Infinity]) assert.equal(levelProgress(xp).fraction, 0);
});
