import { test } from "node:test";
import assert from "node:assert/strict";
import { FogCellIndex } from "./fog-index.ts";
import { cellCenter, cellOf, cellsInRadius } from "./geo.ts";

test("index matches a full scan across block boundaries and after reset", () => {
  const index = new FogCellIndex();
  const keys = new Set<string>();
  for (const point of [{ lat: 43.1155, lon: 131.8855 }, { lat: 43.22, lon: 132.1 }, { lat: -43.1, lon: -131.8 }]) {
    for (const key of cellsInRadius(point, 600)) { keys.add(key); index.add(key); index.add(key); }
  }
  for (const point of [{ lat: 43.1155, lon: 131.8855 }, { lat: -43.1, lon: -131.8 }]) {
    const win = { w: point.lon - 0.003, e: point.lon + 0.003, s: point.lat - 0.003, n: point.lat + 0.003 };
    const actual = [...index.inWindow(win, 0)].map(([row, col]) => `${row}:${col}`).sort();
    const expected = [...keys].filter(key => {
      const [row, col] = key.split(":").map(Number);
      const center = cellCenter(row, col);
      const southwest = cellOf({ lat: win.s, lon: win.w });
      const northeast = cellOf({ lat: win.n, lon: win.e });
      return row >= southwest.row && row <= northeast.row && col >= cellOf({ lat: center.lat, lon: win.w }).col && col <= cellOf({ lat: center.lat, lon: win.e }).col;
    }).sort();
    assert.deepEqual(actual, expected);
    assert.equal(new Set(actual).size, actual.length);
  }
  index.clear();
  assert.deepEqual([...index.inWindow({ w: -180, e: 180, s: -80, n: 80 })], []);
});
