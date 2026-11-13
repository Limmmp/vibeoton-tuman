import { test } from "node:test";
import assert from "node:assert/strict";
import type { StyleSpecification } from "maplibre-gl";
import { prepareMapStyle } from "./map-style.ts";

test("colour map preserves palette, sources, road geometry and reference shields", () => {
  const style: StyleSpecification = { version: 8, sources: { streets: { type: "vector", url: "https://example.com/tiles.json" } }, layers: [
    { id: "background", type: "background", paint: { "background-color": "#f8f4f0" } },
    { id: "highway_path", type: "line", source: "streets", "source-layer": "transportation", paint: { "line-color": "#f6d679", "line-width": 3 } },
    { id: "names", type: "symbol", source: "streets", layout: { "text-field": ["get", "name"] } },
    { id: "shield", type: "symbol", source: "streets", layout: { "text-field": ["get", "ref"] } },
    { id: "building-3d", type: "fill-extrusion", source: "streets", "source-layer": "building" },
    { id: "water", type: "fill", source: "streets", "source-layer": "water", paint: { "fill-color": "#a6cee3" } },
    { id: "building", type: "fill", source: "streets", "source-layer": "building", minzoom: 13, maxzoom: 14, paint: { "fill-color": "#dcd8d2" } },
  ] };
  const sources = structuredClone(style.sources);
  const paints = style.layers.filter(layer => layer.type !== "fill-extrusion").map(layer => structuredClone(layer.paint));
  const result = prepareMapStyle(style);
  assert.deepEqual(result.sources, sources);
  const background = result.layers[0];
  assert.equal(background.type === "background" && background.paint?.["background-color"], "#f8f4f0");
  assert.deepEqual(result.layers.map(layer => layer.paint), paints);
  assert.ok(result.layers.every(layer => layer.type !== "fill-extrusion"));
  assert.equal(result.layers.find(layer => layer.id === "building")?.maxzoom, undefined);
  const road = result.layers[1];
  assert.equal(road.type === "line" && road.paint?.["line-width"], 3);
  const names = result.layers[2], shield = result.layers[3];
  assert.deepEqual(names.type === "symbol" && names.layout?.["text-field"], ["coalesce", ["get", "name:ru"], ["get", "name"]]);
  assert.deepEqual(shield.type === "symbol" && shield.layout?.["text-field"], ["get", "ref"]);
});
