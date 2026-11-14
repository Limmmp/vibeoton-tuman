import type { Map as MLMap, StyleSpecification } from "maplibre-gl";

export const FALLBACK_SOURCE = "basemap-raster";
export const FALLBACK_LAYER = "basemap-raster";
export type BasemapStatus = { provider: "vector" | "raster"; ready: boolean; message?: string };

export function rasterStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      [FALLBACK_SOURCE]: {
        type: "raster", tileSize: 256, maxzoom: 19,
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      },
    },
    layers: [
      { id: "background", type: "background", paint: { "background-color": "#000000" } },
      { id: FALLBACK_LAYER, type: "raster", source: FALLBACK_SOURCE, paint: { "raster-fade-duration": 0, "raster-saturation": -1, "raster-brightness-max": 0.22 } },
    ],
  };
}

/** Switch only the basemap; fog, routes, player and game state stay mounted. */
export class BasemapFallback {
  status: BasemapStatus;
  private listeners: ((status: BasemapStatus) => void)[] = [];
  private timer: ReturnType<typeof setTimeout> | undefined;
  private map: MLMap;

  constructor(map: MLMap) {
    this.map = map;
    this.status = { provider: map.getStyle().sources.openmaptiles ? "vector" : "raster", ready: false };
    map.on("error", event => {
      const source = "sourceId" in event ? event.sourceId : undefined;
      if (source === "openmaptiles") this.useRaster();
      if (source === FALLBACK_SOURCE) this.setStatus({ provider: "raster", ready: false, message: "Не загружаются обе подложки карты. Проверь интернет или VPN." });
    });
    map.on("sourcedata", event => {
      if (!event.isSourceLoaded) return;
      if (event.sourceId === FALLBACK_SOURCE && "tile" in event && (event.tile as { state?: string })?.state === "loaded" && this.status.provider === "raster") {
        this.setStatus({ provider: "raster", ready: true });
      }
      if (event.sourceId === "openmaptiles" && (
        map.querySourceFeatures("openmaptiles", { sourceLayer: "transportation" }).length ||
        map.querySourceFeatures("openmaptiles", { sourceLayer: "water" }).length
      )) {
        clearTimeout(this.timer);
        // A completed vector load can replace the temporary raster without a style reset.
        if (map.getLayer(FALLBACK_LAYER)) map.setLayoutProperty(FALLBACK_LAYER, "visibility", "none");
        this.setStatus({ provider: "vector", ready: true });
      }
    });
    map.on("remove", () => clearTimeout(this.timer));
    this.timer = setTimeout(() => { if (!this.status.ready && this.status.provider === "vector") this.useRaster(); }, 8000);
  }

  onChange(listener: (status: BasemapStatus) => void) { this.listeners.push(listener); }

  useRaster() {
    if (this.status.provider === "raster") return;
    clearTimeout(this.timer);
    const fallback = rasterStyle();
    if (!this.map.getSource(FALLBACK_SOURCE)) this.map.addSource(FALLBACK_SOURCE, fallback.sources[FALLBACK_SOURCE]);
    if (!this.map.getLayer(FALLBACK_LAYER)) {
      const before = this.map.getStyle().layers.find(layer => layer.type !== "background")?.id;
      this.map.addLayer(fallback.layers[1], before);
    }
    this.map.setLayoutProperty(FALLBACK_LAYER, "visibility", "visible");
    this.setStatus({ provider: "raster", ready: false });
  }

  private setStatus(status: BasemapStatus) {
    if (JSON.stringify(this.status) === JSON.stringify(status)) return;
    this.status = status;
    for (const listener of this.listeners) listener(status);
  }
}
