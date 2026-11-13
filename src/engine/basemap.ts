// Базовая карта: цветной стиль OpenFreeMap, рельеф, отмывка склонов, 3D-дома, небо с дымкой.

import { addBuildingLayers, setBuildingsVisible } from "./buildings";
import maplibregl, { type Map as MLMap, type StyleSpecification } from "maplibre-gl";
import { prepareMapStyle } from "./map-style";
import { darkenStyle } from "./dark-style";
import { rasterStyle } from "./basemap-fallback";
import { TERRARIUM_URL } from "./dem";
import type { RenderProfile } from "./performance";

export const STYLE_URL = "https://tiles.openfreemap.org/styles/liberty";
export const VLADIVOSTOK = { lat: 43.1155, lon: 131.8855 }; // Центральная площадь

export type ViewMode = "2d" | "3d";
const TERRAIN_EXAGGERATION = 1.5; // сопки чуть преувеличены, чтобы рельеф читался с телефона
const PITCH_3D = 60;

const demSource = {
  type: "raster-dem" as const,
  tiles: [TERRARIUM_URL],
  tileSize: 256,
  encoding: "terrarium" as const,
  maxzoom: 15,
  attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md">Рельеф: Mapzen / AWS Terrain Tiles</a>',
};

/** Подписи на русском, где они есть в OSM. Шильды дорог (ref) не трогаем. */
function russianLabels(style: StyleSpecification): StyleSpecification {
  return prepareMapStyle(style);
}

export async function createBaseMap(container: HTMLElement | string, center = VLADIVOSTOK, profile?: RenderProfile): Promise<MLMap> {
  let style: StyleSpecification;
  try {
    const response = await fetch(STYLE_URL, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Не удалось загрузить стиль карты: HTTP ${response.status}`);
    style = darkenStyle(russianLabels(await response.json()));
    if (!style.sources?.openmaptiles || !style.layers?.length) throw new Error("Некорректный стиль карты");
  } catch (error) {
    console.warn("[basemap] Резервная подложка:", error);
    style = rasterStyle();
  }
  return new maplibregl.Map({
    container,
    style,
    center: [center.lon, center.lat],
    zoom: 15,
    maxPitch: 75,
    pixelRatio: profile?.pixelRatio,
    fadeDuration: profile?.mobile ? 0 : 300,
    attributionControl: { compact: true },
  });
}

/**
 * Отмывка склонов поверх тумана: сопки читаются даже там, где ты ещё не был.
 * Рельеф — не секрет, а главная особенность города; секретом остаются улицы и места.
 */
export function addHillshadeOverFog(map: MLMap, beforeId?: string, profile?: RenderProfile) {
  map.addLayer(
    {
      id: "hillshade-over-fog",
      type: "hillshade",
      source: "dem-hillshade",
      layout: { visibility: profile?.hillshade === false ? "none" : "visible" },
      paint: {
        "hillshade-exaggeration": 0.55,
        "hillshade-shadow-color": "rgba(10,16,24,0.85)",
        "hillshade-highlight-color": "rgba(255,255,255,0.12)",
        "hillshade-accent-color": "rgba(10,16,24,0.4)",
        "hillshade-illumination-direction": 315,
      },
    },
    beforeId,
  );
}

/** Слои рельефа и домов. Вызывать после события load. Возвращает id слоя, перед которым класть туман. */
export function addTerrainLayers(map: MLMap): string | undefined {
  const layers = map.getStyle().layers;
  // Подписи в стиле встречаются и среди геометрии (названия воды идут раньше дорог),
  // поэтому туман и 3D-дома кладём перед первой подписью ПОСЛЕ последнего слоя геометрии.
  let lastGeom = -1;
  layers.forEach((l, i) => { if (l.type !== "symbol") lastGeom = i; });
  const firstSymbol = layers.slice(lastGeom + 1).find((l) => l.type === "symbol")?.id;

  map.addSource("dem-terrain", demSource);
  // Отдельный экземпляр для отмывки — так рекомендует MapLibre. Сам слой отмывки кладётся поверх тумана
  // (addHillshadeOverFog), чтобы сопки было видно и в открытых местах, и под туманом.
  map.addSource("dem-hillshade", demSource);

  // Объёмные дома — только открытой области: стены с окнами и крыши (buildings.ts).
  addBuildingLayers(map, firstSymbol);

  // Небо и дымка у горизонта — «туман» в прямом смысле. Видно только при наклоне.
  try {
    map.setSky({
      "sky-color": "#0b1320",
      "horizon-color": "#3a4656",
      "fog-color": "#28323f",
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.35,
      "atmosphere-blend": 0,
    });
  } catch {
    /* старый движок без неба — не критично */
  }
  return firstSymbol;
}

export function setViewMode(map: MLMap, mode: ViewMode, profile?: RenderProfile, tilted2d = false) {
  // При наклоне не загружаем дальние тайлы с детализацией ближнего плана.
  map.setSourceTileLodParams(4, profile?.mobile && profile.quality !== "high" ? 1.5 : 3);
  if (mode === "3d") {
    map.setTerrain(profile?.terrain === false ? null : { source: "dem-terrain", exaggeration: TERRAIN_EXAGGERATION });
    setBuildingsVisible(map, profile?.show3dBuildings !== false);
    map.easeTo({ pitch: profile?.pitch3d ?? PITCH_3D, duration: profile?.mobile ? 350 : 900 });
  } else {
    map.setTerrain(null);
    setBuildingsVisible(map, false);
    map.easeTo({ pitch: tilted2d ? 45 : 0, bearing: 0, duration: profile?.mobile ? 300 : 700 });
  }
}
