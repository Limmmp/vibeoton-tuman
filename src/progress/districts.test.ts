// Тесты прогресса по районам и наград не за квест. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { DistrictTracker } from "./districts.ts";
import { ProgressManager } from "./progress.ts";
import { DISTRICT_CENTERS, DISTRICT_SIDE, bitIndex, districtWindow, type DistrictData } from "../data/districts.ts";
import { cellOf, move } from "../engine/geo.ts";

// Синтетический район «Центр»: квадрат 10×10 уличных ячеек у самого центра
// (рядом с центром ближайший район — точно «Центр», а не соседний).
const center = DISTRICT_CENTERS.find((d) => d.id === "center")!;
const street: string[] = [];
for (let dy = 0; dy < 10; dy++) {
  for (let dx = 0; dx < 10; dx++) {
    const c = cellOf(move(move(center, 0, dy * 20 + 10), 90, dx * 20 + 10));
    street.push(`${c.row}:${c.col}`);
  }
}
const unique = [...new Set(street)];

function makeData(): DistrictData[] {
  const win = districtWindow(center);
  const buf = new Uint8Array(Math.ceil((DISTRICT_SIDE * DISTRICT_SIDE) / 8));
  const d: DistrictData = { id: "center", name: "Центр", lat: center.lat, lon: center.lon, streetCells: 0, ...win, bits: "" };
  for (const k of unique) {
    const [row, col] = k.split(":").map(Number);
    const idx = bitIndex(d, row, col);
    buf[idx >> 3] |= 1 << (idx & 7);
    d.streetCells++;
  }
  d.bits = Buffer.from(buf).toString("base64");
  return [d];
}

test("районы: процент считается только по уличным ячейкам", () => {
  const t = new DistrictTracker(makeData());
  const offStreet = cellOf(move(center, 0, 500));
  t.recount([...unique.slice(0, 10), `${offStreet.row}:${offStreet.col}`]);
  const s = t.stats()[0];
  assert.equal(s.total, unique.length);
  assert.equal(s.revealed, 10);
  assert.equal(s.pct, Math.floor((10 / unique.length) * 100));
});

test("районы: вехи срабатывают один раз при пересечении порога", () => {
  const t = new DistrictTracker(makeData());
  const quarter = Math.ceil(unique.length * 0.25);
  assert.equal(t.add(unique.slice(0, quarter - 1)).length, 0);
  const hits = t.add(unique.slice(quarter - 1, quarter));
  assert.deepEqual(hits.map((h) => h.pct), [25]);
  // Прыжок сразу через две вехи — обе в одном шаге.
  const hits2 = t.add(unique.slice(quarter, Math.ceil(unique.length * 0.76)));
  assert.deepEqual(hits2.map((h) => h.pct), [50, 75]);
  assert.equal(t.stats()[0].milestone, 75);
});

test("награды не за квест: один ключ — одна выдача, в completedQuests не попадает", () => {
  const p = new ProgressManager();
  const reward = { xp: 100, cash: 50, rep: 0, items: [] };
  const first = p.grantReward({ key: "district:center:25", source: "district", title: "Центр: 25 %", reward, trusted: true });
  assert.equal(first.granted, true);
  assert.equal(first.source, "district");
  const again = p.grantReward({ key: "district:center:25", source: "district", title: "Центр: 25 %", reward, trusted: true });
  assert.equal(again.granted, false);
  assert.equal(again.reason, "already-completed");
  assert.equal(p.state.cash, 50);
  assert.equal(Object.keys(p.state.completedQuests).length, 0);
  assert.ok(p.state.claimed["district:center:25"]);
});

test("старое сохранение без поля claimed загружается", () => {
  const legacy = { version: 1, xp: 10, level: 1, cash: 5, rep: 0, inventory: {}, equipped: {}, completedQuests: {} } as never;
  const p = new ProgressManager({ initial: legacy });
  assert.deepEqual(p.state.claimed, {});
});
