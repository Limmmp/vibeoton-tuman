// Тесты освещения домов. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { isNightInVladivostok, lightFor } from "./buildings.ts";

test("дома: ночь считается по времени Владивостока (UTC+10), а не по часам устройства", () => {
  assert.equal(isNightInVladivostok(new Date("2026-11-13T12:00:00+10:00")), false);
  assert.equal(isNightInVladivostok(new Date("2026-11-13T18:30:00+10:00")), true);
  assert.equal(isNightInVladivostok(new Date("2026-11-13T06:59:00+10:00")), true);
  assert.equal(isNightInVladivostok(new Date("2026-11-13T07:00:00+10:00")), false);
  // 09:00 UTC — это 19:00 во Владивостоке.
  assert.equal(isNightInVladivostok(new Date("2026-11-13T09:00:00Z")), true);
});

test("дома: ночной свет тёплый и тусклее дневного", () => {
  const night = lightFor(true), day = lightFor(false);
  assert.ok((night.intensity as number) < (day.intensity as number));
  assert.notEqual(night.color, day.color);
});
