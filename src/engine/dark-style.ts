import type { LayerSpecification, StyleSpecification } from "maplibre-gl";

// Ночная тема подложки под интерфейс приложения («Туман»): город в темноте, вода
// глубоко-синяя, парки едва зелёные, крупные дороги светлее мелких, а магистрали
// тёплые — как цепочки фонарей. Палитра Liberty сохраняется в prepareMapStyle,
// тема накладывается отдельно и только перекрашивает paint-свойства.

type Paint = Record<string, unknown>;

/** Правила по id слоя стиля Liberty (OpenFreeMap). Первое совпадение побеждает. */
const RULES: [RegExp, Paint][] = [
  [/^background$/, { "background-color": "#141414" }],
  [/^natural_earth$/, { "raster-opacity": 0.25, "raster-saturation": -0.8, "raster-brightness-max": 0.3 }],
  [/^park_outline$/, { "line-color": "#252525" }],
  [/^park$|^landcover_(wood|grass)$|^landuse_(pitch|track)$/, { "fill-color": "#191919" }],
  [/^landcover_wetland$/, { "fill-color": "#1a1a1a" }],
  [/^landcover_ice$/, { "fill-color": "#212121" }],
  [/^landcover_sand$/, { "fill-color": "#1a1a1a" }],
  [/^landuse_residential$/, { "fill-color": "#181818" }],
  [/^landuse_cemetery$/, { "fill-color": "#181818" }],
  [/^landuse_hospital$/, { "fill-color": "#181818" }],
  [/^landuse_school$/, { "fill-color": "#161616" }],
  [/^waterway/, { "line-color": "#272727" }],
  [/^water$/, { "fill-color": "#1c1c1c" }],
  [/^road_area_pattern$/, { "fill-opacity": 0.12 }], // пешеходные зоны: светлая штриховка Liberty на тёмном слепит
  [/^aeroway_fill$/, { "fill-color": "#1c1c1c" }],
  [/^aeroway_/, { "line-color": "#333333" }],
  [/_casing$/, { "line-color": "#0f0f0f" }],
  [/_rail(_hatching)?$/, { "line-color": "#373737" }],
  [/motorway/, { "line-color": "#525252" }],
  [/trunk_primary$/, { "line-color": "#555555" }],
  [/secondary_tertiary$/, { "line-color": "#424242" }],
  [/(minor|street|link)$/, { "line-color": "#313131" }],
  [/service_track$/, { "line-color": "#2a2a2a" }],
  [/path_pedestrian$/, { "line-color": "#3d3d3d" }],
  [/^building$/, { "fill-color": "#212121", "fill-outline-color": "#2b2b2b" }],
  [/^boundary/, { "line-color": "#464646" }],
];

/** Цвет подписей по типу объекта: места ярче, улицы спокойнее, вода синяя. */
function symbolPaint(layer: LayerSpecification): Paint {
  const source = "source-layer" in layer ? layer["source-layer"] : undefined;
  const text =
    source === "place" ? "#d1d1d1" :
    source === "water_name" || source === "waterway" ? "#777777" :
    source === "poi" || source === "aerodrome_label" ? "#989898" :
    "#a6a6a6";
  return { "text-color": text, "text-halo-color": "#101010", "icon-opacity": source === "poi" ? 0.7 : 1 };
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
