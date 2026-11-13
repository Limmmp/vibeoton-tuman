// 3D-дома «не кирпичами»: стены с текстурой окон, крыша с цветом по высоте, свет по времени суток.
//
// Дом — два слоя поверх одного GeoJSON-источника lit-buildings (дома только открытой области, см. engine.ts):
//   building-3d       — стены: fill-extrusion-pattern с окнами, от основания до (высота − 0,6 м);
//   building-3d-roof  — крыша: тонкая плита 0,6 м сверху, цвет по высоте (иначе окна были бы и на крышах).
// Ночью окна тёплые и часть из них горит, днём — холодные отражения. Текстуру рисуем кодом;
// когда будет текстура Макса (assets/map/windows-*.png), её можно подставить через map.addImage с тем же именем.

import type { Map as MLMap, LightSpecification } from "maplibre-gl";
import { VVO_OFFSET_MIN } from "../match/hours.ts";

export const BUILDING_LAYERS = ["building-3d", "building-3d-roof"] as const;
export type LightingMode = "auto" | "day" | "night";

const ROOF = 0.6; // м — толщина плиты крыши
const SIZE = 64; // px — сторона текстуры окон

const HEIGHT: unknown = ["coalesce", ["get", "h"], 8];
const BASE: unknown = ["coalesce", ["get", "b"], 0];

/** Детерминированный «случайный» генератор: одинаковые окна при каждом запуске. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/** Текстура фасада: сетка окон 8×6 на 64×64 px (окно ~5×7 px — примерно окно на этаж при зуме 16–17). */
function windowPattern(night: boolean): ImageData {
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d")!;
  g.fillStyle = night ? "#161d27" : "#3a4555"; // стена
  g.fillRect(0, 0, SIZE, SIZE);
  const rand = rng(night ? 7 : 3);
  const cols = 8, rows = 6, cw = SIZE / cols, rh = SIZE / rows;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const x = Math.round(k * cw + 1.5), y = Math.round(r * rh + 2), w = Math.round(cw - 3), h = Math.round(rh - 4);
      if (night) {
        const lit = rand() < 0.42;
        const warm = ["#F5B83D", "#FFD27A", "#E89A3C", "#FFE3A3"][Math.floor(rand() * 4)];
        g.fillStyle = lit ? warm : "#0c1118";
        g.globalAlpha = lit ? 0.55 + rand() * 0.4 : 1;
      } else {
        g.fillStyle = rand() < 0.5 ? "#8fa3b8" : "#6f8297"; // стекло отражает небо
        g.globalAlpha = 0.9;
      }
      g.fillRect(x, y, w, h);
      g.globalAlpha = 1;
    }
  }
  return g.getImageData(0, 0, SIZE, SIZE);
}

/** Добавить картинки окон и слои домов. Вызывать после load, перед подписями. */
export function addBuildingLayers(map: MLMap, beforeId?: string) {
  map.addImage("windows-night", windowPattern(true));
  map.addImage("windows-day", windowPattern(false));
  map.addSource("lit-buildings", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
  map.addLayer(
    {
      id: "building-3d",
      type: "fill-extrusion",
      source: "lit-buildings",
      minzoom: 14,
      layout: { visibility: "none" },
      paint: {
        "fill-extrusion-pattern": "windows-night",
        "fill-extrusion-height": ["max", ["-", HEIGHT, ROOF], BASE] as never,
        "fill-extrusion-base": BASE as never,
        "fill-extrusion-opacity": 0.95,
        "fill-extrusion-vertical-gradient": true,
      },
    },
    beforeId,
  );
  map.addLayer(
    {
      id: "building-3d-roof",
      type: "fill-extrusion",
      source: "lit-buildings",
      minzoom: 14,
      layout: { visibility: "none" },
      paint: {
        // Низкие дома темнее, высотки светлее — силуэт города читается издалека.
        "fill-extrusion-color": ["interpolate", ["linear"], HEIGHT, 0, "#1f2833", 20, "#2b3543", 60, "#3d4a5c", 150, "#56647a"] as never,
        "fill-extrusion-height": HEIGHT as never,
        "fill-extrusion-base": ["max", ["-", HEIGHT, ROOF], BASE] as never,
        "fill-extrusion-opacity": 0.95,
      },
    },
    beforeId,
  );
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

/** Применить освещение: окна день/ночь и свет. auto — по времени Владивостока. */
export function applyLighting(map: MLMap, mode: LightingMode, now = new Date()): boolean {
  const night = mode === "night" || (mode === "auto" && isNightInVladivostok(now));
  if (map.getLayer("building-3d")) map.setPaintProperty("building-3d", "fill-extrusion-pattern", night ? "windows-night" : "windows-day");
  map.setLight(lightFor(night));
  return night;
}
