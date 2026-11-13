import { cellOf } from "./geo.ts";
import type { FogWindow } from "./fog-index.ts";
import { overlapsLandmark, type LandmarkPlacement } from "../models/placement.ts";

type Building = { key: string; feature: GeoJSON.Feature<GeoJSON.Polygon>; lon: number; lat: number };

/** Cache decoded building polygons between vector tile changes. */
export class BuildingIndex {
  private cells = new Map<string, Building[]>();
  private signature: string[] | undefined = [];

  replace(features: Iterable<GeoJSON.Feature>) {
    this.cells.clear();
    const seen = new Set<string>();
    for (const feature of features) {
      const g = feature.geometry;
      const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      for (const rings of polys) {
        const first = rings[0]?.[0];
        if (!first) continue;
        const [lon, lat] = first;
        const id = `${lon.toFixed(7)},${lat.toFixed(7)}`;
        if (seen.has(id)) continue;
        seen.add(id);
        const properties = { h: feature.properties?.render_height, b: feature.properties?.render_min_height };
        const value: Building = { lon, lat, key: JSON.stringify([rings, properties]), feature: { type: "Feature", geometry: { type: "Polygon", coordinates: rings }, properties } };
        const { row, col } = cellOf({ lon, lat });
        const key = `${row}:${col}`;
        let list = this.cells.get(key);
        if (!list) this.cells.set(key, list = []);
        list.push(value);
      }
    }
  }

  select(revealed: Iterable<[number, number]>, win: FogWindow, limit: number, replacements: LandmarkPlacement[] = []): GeoJSON.Feature[] | null {
    const out: GeoJSON.Feature[] = [];
    const keys: string[] = [];
    outer: for (const [row, col] of revealed) {
      for (const item of this.cells.get(`${row}:${col}`) ?? []) {
        if (out.length >= limit) break outer;
        if (item.lon < win.w || item.lon > win.e || item.lat < win.s || item.lat > win.n) continue;
        if (replacements.some(landmark => overlapsLandmark(item.feature.geometry.coordinates, landmark))) continue;
        keys.push(item.key);
        out.push(item.feature);
      }
    }
    // Не склеиваем координаты всех домов в многомегабайтную строку при каждом шаге.
    if (this.signature?.length === keys.length && keys.every((key, i) => key === this.signature![i])) return null;
    this.signature = keys;
    return out;
  }

  invalidate() { this.signature = undefined; }
}
