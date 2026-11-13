// 3D-дома: один непрозрачный слой, цвет по высоте и свет по времени суток.
// Стены и крыши различаются освещением без повторной отрисовки геометрии.

import type { Map as MLMap, LightSpecification, FillExtrusionLayerSpecification } from "maplibre-gl";
import { VVO_OFFSET_MIN } from "../match/hours.ts";

export const BUILDING_LAYERS = ["building-3d"] as const;
export type LightingMode = "auto" | "day" | "night";

const HEIGHT: unknown = ["coalesce", ["get", "h"], 8];
const BASE: unknown = ["coalesce", ["get", "b"], 0];

/** Один непрозрачный слой: без повторяющихся окон и отдельной плиты крыши. */
export function buildingLayer(): FillExtrusionLayerSpecification {
  return {
    id: "building-3d", type: "fill-extrusion", source: "lit-buildings", minzoom: 14,
    layout: { visibility: "none" },
    paint: {
      // Низкие дома темнее, высотки светлее — силуэт города читается издалека.
      "fill-extrusion-color": ["interpolate", ["linear"], HEIGHT, 0, "#1f2833", 20, "#2b3543", 60, "#3d4a5c", 150, "#56647a"] as never,
      "fill-extrusion-height": HEIGHT as never,
      "fill-extrusion-base": BASE as never,
      "fill-extrusion-opacity": 1,
      "fill-extrusion-vertical-gradient": true,
    },
  };
}

/** Добавить общий источник и слой домов после загрузки стиля, перед подписями. */
export function addBuildingLayers(map: MLMap, beforeId?: string) {
  map.addSource("lit-buildings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer(buildingLayer(), beforeId);
}

export function setBuildingsVisible(map: MLMap, visible: boolean) {
  for (const id of BUILDING_LAYERS) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
}

/** Ночь по времени Владивостока: с 18:00 до 07:00. */
export function isNightInVladivostok(t = new Date()): boolean {
  const h = new Date(t.getTime() + VVO_OFFSET_MIN * 60000).getUTCHours();
  return h >= 18 || h < 7;
}

/** Свет сцены: днём холодный и высокий, ночью тёплый, низкий, приглушённый. */
export function lightFor(night: boolean): LightSpecification {
  return night
    ? { anchor: "map", color: "#ffd9a0", intensity: 0.35, position: [1.4, 230, 70] }
    : { anchor: "map", color: "#dfe8ff", intensity: 0.55, position: [1.5, 200, 35] };
}

/** Применить свет сцены. auto — по времени Владивостока. */
export function applyLighting(map: MLMap, mode: LightingMode, now = new Date()): boolean {
  const night = mode === "night" || (mode === "auto" && isNightInVladivostok(now));
  map.setLight(lightFor(night));
  return night;
}
