import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("четыре GLB-слота имеют уникальные имена, координаты и источники", () => {
  const items = JSON.parse(readFileSync(new URL("../../public/models/landmarks/manifest.json", import.meta.url), "utf8"));
  assert.equal(items.length, 4);
  assert.equal(new Set(items.map((item: { id: string }) => item.id)).size, 4);
  assert.deepEqual(items.map((item: { model: string }) => item.model).sort(), ["bridge.glb", "funicular.glb", "lighthouse.glb", "s56.glb"]);
  for (const item of items) {
    assert.ok(item.lat > 42 && item.lat < 44 && item.lon > 131 && item.lon < 133);
    assert.ok(item.mapSizeMeters > 0 && item.mapSizeMeters <= 200);
    assert.match(item.source, /^https:\/\//);
    assert.equal(item.verified, false);
  }
});
