// Тесты освещения домов. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { addBuildingLayers, applyLighting, BUILDING_LAYERS, buildingLayer, isNightInVladivostok, lightFor } from "./buildings.ts";
import type { Map as MLMap } from "maplibre-gl";

test("дома: один непрозрачный слой без окон, атласа и отдельной крыши", () => {
  const layers: unknown[] = [], sources: string[] = [];
  const map = {
    addSource: (id: string) => sources.push(id),
    addLayer: (layer: unknown) => layers.push(layer),
  } as unknown as MLMap;
  addBuildingLayers(map);
  assert.deepEqual(sources, ["lit-buildings"]);
  assert.equal(layers.length, 1);
  assert.deepEqual(BUILDING_LAYERS, ["building-3d"]);
  const layer = buildingLayer();
  assert.equal(layer.paint?.["fill-extrusion-opacity"], 1);
  assert.equal(layer.paint?.["fill-extrusion-pattern"], undefined);
  assert.deepEqual(layer.paint?.["fill-extrusion-height"], ["coalesce", ["get", "h"], 8]);
  assert.deepEqual(layer.paint?.["fill-extrusion-base"], ["coalesce", ["get", "b"], 0]);
});

test("дома: переключение дня и ночи меняет только свет сцены", () => {
  const lights: unknown[] = [];
  const map = { setLight: (light: unknown) => lights.push(light) } as unknown as MLMap;
  assert.equal(applyLighting(map, "day"), false);
  assert.equal(applyLighting(map, "night"), true);
  assert.deepEqual(lights, [lightFor(false), lightFor(true)]);
});

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
