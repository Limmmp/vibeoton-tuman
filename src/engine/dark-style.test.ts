import { test } from "node:test";
import assert from "node:assert/strict";
import type { StyleSpecification } from "maplibre-gl";
import { darkenStyle } from "./dark-style.ts";

const style = (): StyleSpecification => ({ version: 8, sources: { s: { type: "vector", url: "https://example.com/tiles.json" } }, layers: [
  { id: "background", type: "background", paint: { "background-color": "#f8f4f0" } },
  { id: "water", type: "fill", source: "s", "source-layer": "water", paint: { "fill-color": "#a6cee3", "fill-opacity": 1 } },
  { id: "road_minor_casing", type: "line", source: "s", "source-layer": "transportation", paint: { "line-color": "#cfcdca", "line-width": 4 } },
  { id: "road_motorway", type: "line", source: "s", "source-layer": "transportation", paint: { "line-color": "#fc8", "line-width": 6 } },
  { id: "road_minor", type: "line", source: "s", "source-layer": "transportation", paint: { "line-color": "#fff" } },
  { id: "label_city", type: "symbol", source: "s", "source-layer": "place", layout: { "text-field": "{name}" }, paint: { "text-color": "#333" } },
  { id: "unknown", type: "fill", source: "s", "source-layer": "x", paint: { "fill-color": "#abc" } },
] });

const paint = (s: StyleSpecification, id: string) => s.layers.find(layer => layer.id === id)?.paint as Record<string, unknown>;
const lightness = (hex: string) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) + ((n >> 8) & 255) + (n & 255)) / 3; };

test("фон и вода становятся тёмными, прочие свойства сохраняются", () => {
  const s = darkenStyle(style());
  assert.ok(lightness(paint(s, "background")["background-color"] as string) < 40);
  assert.ok(lightness(paint(s, "water")["fill-color"] as string) < 40);
  assert.equal(paint(s, "water")["fill-opacity"], 1);
  assert.equal(paint(s, "road_motorway")["line-width"], 6);
});

test("дороги светлее фона, магистраль светлее мелкой улицы, обводка темнее всех", () => {
  const s = darkenStyle(style());
  const bg = lightness(paint(s, "background")["background-color"] as string);
  const minor = lightness(paint(s, "road_minor")["line-color"] as string);
  const motorway = lightness(paint(s, "road_motorway")["line-color"] as string);
  const casing = lightness(paint(s, "road_minor_casing")["line-color"] as string);
  assert.ok(minor > bg && motorway > minor && casing < bg);
});

test("подписи светлые с тёмным ореолом, незнакомые слои не трогаются", () => {
  const s = darkenStyle(style());
  assert.ok(lightness(paint(s, "label_city")["text-color"] as string) > 150);
  assert.equal(paint(s, "label_city")["text-halo-color"], "#0A1016");
  assert.equal(paint(s, "unknown")["fill-color"], "#abc");
});
