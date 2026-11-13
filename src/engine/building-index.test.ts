import { test } from "node:test";
import assert from "node:assert/strict";
import { BuildingIndex } from "./building-index.ts";
import { cellOf } from "./geo.ts";

const building = (lon: number, lat: number, height = 10): GeoJSON.Feature<GeoJSON.Polygon> => ({
  type: "Feature", properties: { render_height: height },
  geometry: { type: "Polygon", coordinates: [[[lon, lat], [lon + 0.00005, lat], [lon, lat + 0.00005], [lon, lat]]] },
});
const win = { w: 131.88, e: 131.89, s: 43.11, n: 43.12 };
const a = building(131.885, 43.115), b = building(131.886, 43.116);
const cells = [a, b].map(feature => {
  const [lon, lat] = feature.geometry.coordinates[0][0];
  const { row, col } = cellOf({ lon, lat });
  return [row, col] as [number, number];
});

test("buildings deduplicate tiles, obey reveal and exact limit, skip unchanged data", () => {
  const index = new BuildingIndex();
  index.replace([a, a, b]);
  assert.equal(index.select([cells[0]], win, 10)?.length, 1);
  assert.equal(index.select([cells[0]], win, 10), null);
  assert.equal(index.select(cells, win, 1), null);
  assert.equal(index.select(cells, win, 2)?.length, 2);
  assert.deepEqual(index.select([], win, 2), []);
  index.invalidate();
  assert.deepEqual(index.select(cells, win, 0), []);
});

test("tile geometry changes invalidate output without changing building IDs", () => {
  const index = new BuildingIndex();
  index.replace([a]);
  index.select(cells, win, 10);
  index.replace([a]);
  assert.equal(index.select(cells, win, 10), null);
  index.replace([building(131.885, 43.115, 30)]);
  assert.equal(index.select(cells, win, 10)?.[0].properties?.h, 30);
  assert.deepEqual(index.select(cells, { ...win, w: 132, e: 133 }, 10), []);
});
