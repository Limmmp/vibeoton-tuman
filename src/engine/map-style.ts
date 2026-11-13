import type { StyleSpecification } from "maplibre-gl";

/** Preserve the colour palette; game-controlled buildings must obey fog and render quality. */
export function prepareMapStyle(style: StyleSpecification): StyleSpecification {
  style.layers = style.layers.filter(layer => layer.type !== "fill-extrusion");
  for (const layer of style.layers) {
    // Liberty normally replaces footprints with extrusions at zoom 14; retain footprints on low/2D.
    if (layer.type === "fill" && layer["source-layer"] === "building") delete layer.maxzoom;
    if (layer.type !== "symbol" || !layer.layout?.["text-field"]) continue;
    const tf = JSON.stringify(layer.layout["text-field"]);
    if (tf.includes("name")) {
      layer.layout["text-field"] = ["coalesce", ["get", "name:ru"], ["get", "name"]];
    }
  }
  return style;
}
