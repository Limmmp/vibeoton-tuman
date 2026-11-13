import { test } from "node:test";
import assert from "node:assert/strict";
import type { Map as MLMap } from "maplibre-gl";
import { BasemapFallback, FALLBACK_LAYER, FALLBACK_SOURCE, rasterStyle } from "./basemap-fallback.ts";

class FakeMap {
  style = { version: 8, sources: { openmaptiles: { type: "vector" } } as Record<string, unknown>, layers: [
    { id: "background", type: "background" }, { id: "roads", type: "line" }, { id: "fog", type: "raster" },
  ] as { id: string; type: string; visibility?: unknown }[] };
  features: unknown[] = [];
  events = new Map<string, ((event: Record<string, unknown>) => void)[]>();
  on(name: string, listener: (event: Record<string, unknown>) => void) {
    this.events.set(name, [...(this.events.get(name) ?? []), listener]);
  }
  fire(name: string, event: Record<string, unknown> = {}) { for (const listener of this.events.get(name) ?? []) listener(event); }
  getStyle() { return this.style; }
  getSource(id: string) { return this.style.sources[id]; }
  getLayer(id: string) { return this.style.layers.find(layer => layer.id === id); }
  addSource(id: string, source: unknown) { this.style.sources[id] = source; }
  addLayer(layer: { id: string; type: string }, before: string) { this.style.layers.splice(this.style.layers.findIndex(item => item.id === before), 0, layer); }
  setLayoutProperty(id: string, _property: string, value: unknown) { this.getLayer(id)!.visibility = value; }
  querySourceFeatures() { return this.features; }
}

test("vector failure adds raster under game layers and recovers without resetting style", t => {
  const map = new FakeMap();
  const fallback = new BasemapFallback(map as unknown as MLMap);
  t.after(() => map.fire("remove"));
  const fog = map.getLayer("fog");
  map.fire("error", { sourceId: "openmaptiles" });
  assert.equal(fallback.status.provider, "raster");
  assert.ok(map.getSource(FALLBACK_SOURCE));
  assert.equal(map.getLayer("fog"), fog);
  assert.deepEqual(map.style.layers.map(layer => layer.id), ["background", FALLBACK_LAYER, "roads", "fog"]);
  map.fire("sourcedata", { sourceId: FALLBACK_SOURCE, isSourceLoaded: true, tile: { state: "loaded" } });
  assert.equal(fallback.status.ready, true);
  map.features = [{}];
  map.fire("sourcedata", { sourceId: "openmaptiles", isSourceLoaded: true });
  assert.deepEqual(fallback.status, { provider: "vector", ready: true });
  assert.equal(map.getLayer(FALLBACK_LAYER)?.visibility, "none");
});

test("stalled vector load switches after 8 seconds and reports raster errors", t => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const map = new FakeMap();
  const fallback = new BasemapFallback(map as unknown as MLMap);
  t.after(() => map.fire("remove"));
  t.mock.timers.tick(8000);
  assert.equal(fallback.status.provider, "raster");
  map.fire("error", { sourceId: FALLBACK_SOURCE });
  assert.match(fallback.status.message ?? "", /VPN/);
  map.fire("sourcedata", { sourceId: FALLBACK_SOURCE, isSourceLoaded: true, tile: { state: "loaded" } });
  assert.deepEqual(fallback.status, { provider: "raster", ready: true });
});

test("local raster style needs no vector metadata, sprites or glyph server", () => {
  const style = rasterStyle();
  assert.equal(style.sprite, undefined);
  assert.equal(style.glyphs, undefined);
  assert.equal(style.sources.openmaptiles, undefined);
  const raster = style.layers[1];
  assert.equal(raster.type === "raster" && raster.source, FALLBACK_SOURCE);
});
