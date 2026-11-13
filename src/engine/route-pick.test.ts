import { test } from "node:test";
import assert from "node:assert/strict";
import { pickRoutes } from "./route-pick.ts";

const r = (distance: number, steep: number, maxGrade: number, name: string) => ({ distance, steep, maxGrade, name });

test("короткий — самый короткий по расстоянию", () => {
  const { short } = pickRoutes([r(1200, 40, 15, "b"), r(1000, 60, 20, "a")]);
  assert.equal(short.name, "a");
});

test("пологий — с наименьшей крутизной в пределах крюка", () => {
  // Реальный случай: Спортивная → Тигровая.
  const { gentle } = pickRoutes([r(2145, 290, 30, "short"), r(2271, 110, 19, "ok"), r(2531, 100, 19, "longer"), r(3136, 260, 30, "worse"), r(3600, 0, 5, "too-long")]);
  assert.equal(gentle?.name, "longer");
});

test("нет пологого, если крутизна почти та же", () => {
  const { gentle } = pickRoutes([r(1000, 120, 20, "short"), r(1100, 100, 18, "almost")]);
  assert.equal(gentle, null);
});

test("пологий по самому крутому месту, если крутых метров не больше", () => {
  const { gentle } = pickRoutes([r(1684, 110, 19, "short"), r(1900, 100, 12, "flat-peak")]);
  assert.equal(gentle?.name, "flat-peak");
});

test("один кандидат — только короткий", () => {
  const { short, gentle } = pickRoutes([r(500, 12, 10, "only")]);
  assert.equal(short.name, "only");
  assert.equal(gentle, null);
});

test("пустой список — ошибка", () => {
  assert.throws(() => pickRoutes([]));
});
