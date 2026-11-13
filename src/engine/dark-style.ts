import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// Ночная тема подложки под интерфейс приложения («Туман»): город в темноте, вода
// глубоко-синяя, парки едва зелёные, крупные дороги светлее мелких, а магистрали
// тёплые — как цепочки фонарей. Палитра Liberty сохраняется в prepareMapStyle,
// тема накладывается отдельно и только перекрашивает paint-свойства.

type Paint = Record<string, unknown>;

/** Правила по id слоя стиля Liberty (OpenFreeMap). Первое совпадение побеждает. */
const RULES: [RegExp, Paint][] = [
  [/^background$/, { "background-color": "#0E1419" }],
  [/^natural_earth$/, { "raster-opacity": 0.25, "raster-saturation": -0.8, "raster-brightness-max": 0.3 }],
  [/^park_outline$/, { "line-color": "#1B2E25" }],
  [/^park$|^landcover_(wood|grass)$|^landuse_(pitch|track)$/, { "fill-color": "#122019" }],
  [/^landcover_wetland$/, { "fill-color": "#10201E" }],
  [/^landcover_ice$/, { "fill-color": "#1A2228" }],
  [/^landcover_sand$/, { "fill-color": "#1C1B16" }],
  [/^landuse_residential$/, { "fill-color": "#11181E" }],
  [/^landuse_cemetery$/, { "fill-color": "#131C18" }],
  [/^landuse_hospital$/, { "fill-color": "#1C1518" }],
  [/^landuse_school$/, { "fill-color": "#19190F" }],
  [/^waterway/, { "line-color": "#0F2A3C" }],
  [/^water$/, { "fill-color": "#0A1E2D" }],
  [/^road_area_pattern$/, { "fill-opacity": 0.12 }], // пешеходные зоны: светлая штриховка Liberty на тёмном слепит
  [/^aeroway_fill$/, { "fill-color": "#151C22" }],
  [/^aeroway_/, { "line-color": "#2A333B" }],
  [/_casing$/, { "line-color": "#0A0F13" }],
  [/_rail(_hatching)?$/, { "line-color": "#2E3740" }],
  [/motorway/, { "line-color": "#6A5833" }],
  [/trunk_primary$/, { "line-color": "#4A5560" }],
  [/secondary_tertiary$/, { "line-color": "#36424D" }],
  [/(minor|street|link)$/, { "line-color": "#27313A" }],
  [/service_track$/, { "line-color": "#212A32" }],
  [/path_pedestrian$/, { "line-color": "#323D47" }],
  [/^building$/, { "fill-color": "#18212A", "fill-outline-color": "#202B35" }],
  [/^boundary/, { "line-color": "#3A4652" }],
];

/** Цвет подписей по типу объекта: места ярче, улицы спокойнее, вода синяя. */
function symbolPaint(layer: LayerSpecification): Paint {
  const source = "source-layer" in layer ? layer["source-layer"] : undefined;
  const text =
    source === "place" ? "#C9D2D9" :
    source === "water_name" || source === "waterway" ? "#4F7C9B" :
    source === "poi" || source === "aerodrome_label" ? "#8C99A4" :
    "#9AA7B2";
  return { "text-color": text, "text-halo-color": "#0A1016", "icon-opacity": source === "poi" ? 0.7 : 1 };
}

export function darkenStyle(style: StyleSpecification): StyleSpecification {
  for (const layer of style.layers) {
    if (layer.type === "symbol") {
      layer.paint = { ...layer.paint, ...symbolPaint(layer) } as typeof layer.paint;
      continue;
    }
    const rule = RULES.find(([pattern]) => pattern.test(layer.id));
    if (!rule) continue;
    const allowed = Object.fromEntries(Object.entries(rule[1]).filter(([key]) => key.startsWith(layer.type === "background" ? "background" : layer.type)));
    if (Object.keys(allowed).length) (layer as { paint?: Paint }).paint = { ...(layer.paint as Paint | undefined), ...allowed };
  }
  return style;
}
