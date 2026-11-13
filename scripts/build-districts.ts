// Собрать data/districts.json: уличные ячейки тумана для каждого района.
// Пешеходные дороги из OSM (Overpass) растеризуются в сетку 20 м; ячейка относится
// к ближайшему центру района не дальше 1800 м. Хранится битсетом окна вокруг центра.
// Запуск: npm run data:districts (разово; результат коммитится).

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { cellCenter, cellOf, distance, lerp, type LatLon } from "../src/engine/geo.ts";
import {
  DISTRICT_CENTERS, DISTRICT_SIDE, bitIndex, districtWindow, nearestDistrictId, type DistrictData,
} from "../src/data/districts.ts";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const HIGHWAYS = "footway|pedestrian|path|steps|living_street|residential|unclassified|tertiary|secondary|primary|service";
const STEP = 8; // м — шаг выборки вдоль линии (меньше ячейки, чтобы не пропускать)

// Рамка, покрывающая все районы с запасом 2 км; режем на плитки, чтобы Overpass не падал по таймауту.
const lats = DISTRICT_CENTERS.map((d) => d.lat), lons = DISTRICT_CENTERS.map((d) => d.lon);
const pad = 0.02;
const S = Math.min(...lats) - pad, N = Math.max(...lats) + pad, W = Math.min(...lons) - pad * 1.4, E = Math.max(...lons) + pad * 1.4;
const TILE = 0.06;

type Way = { geometry?: { lat: number; lon: number }[]; tags?: Record<string, string> };

// Плитки кэшируются на диск: повторный запуск продолжает с места, где упал.
const CACHE = "data/raw/streets";
await mkdir(CACHE, { recursive: true });

async function fetchTile(s: number, w: number, n: number, e: number): Promise<Way[]> {
  const file = `${CACHE}/${s.toFixed(3)}_${w.toFixed(3)}.json`;
  try {
    return JSON.parse(await readFile(file, "utf8")) as Way[];
  } catch {
    /* нет в кэше */
  }
  // Только геометрия и нужные теги — ответ в разы меньше.
  const q = `[out:json][timeout:90];way["highway"~"^(${HIGHWAYS})$"]["access"!~"private|no"](${s},${w},${n},${e});out tags geom qt;`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 100000);
    try {
      const r = await fetch(OVERPASS, { method: "POST", signal: ctrl.signal, headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "tuman-vladivostok-hackathon/0.1" }, body: "data=" + encodeURIComponent(q) });
      if (r.ok) {
        const els = ((await r.json()) as { elements: Way[] }).elements.map((el) => ({ geometry: el.geometry, tags: { highway: el.tags?.highway ?? "", service: el.tags?.service ?? "" } }));
        await writeFile(file, JSON.stringify(els));
        return els;
      }
      console.warn(`\n  Overpass ${r.status}, повтор через 15 с`);
    } catch (err) {
      console.warn(`\n  ${(err as Error).name === "AbortError" ? "таймаут" : (err as Error).message}, повтор через 15 с`);
    } finally {
      clearTimeout(timer);
    }
    await new Promise((res) => setTimeout(res, 15000));
  }
  throw new Error("Overpass не отвечает");
}

const cells = new Set<string>();
let ways = 0;
for (let s = S; s < N; s += TILE) {
  for (let w = W; w < E; w += TILE) {
    const els = await fetchTile(s, w, Math.min(N, s + TILE), Math.min(E, w + TILE));
    ways += els.length;
    for (const el of els) {
      // service-дороги берём только как проезды и аллеи, без парковок и подъездов к гаражам.
      if (el.tags?.highway === "service" && !/^(alley)?$/.test(el.tags.service ?? "")) continue;
      const g = el.geometry ?? [];
      for (let i = 1; i < g.length; i++) {
        const a: LatLon = g[i - 1], b: LatLon = g[i];
        const n = Math.max(1, Math.ceil(distance(a, b) / STEP));
        for (let k = 0; k <= n; k++) {
          const c = cellOf(lerp(a, b, k / n));
          cells.add(`${c.row}:${c.col}`);
        }
      }
    }
    console.log(`плитка ${s.toFixed(2)},${w.toFixed(2)} · линий ${ways} · ячеек ${cells.size}`);
  }
}
console.log();

// Раскладываем ячейки по районам.
const out: DistrictData[] = DISTRICT_CENTERS.map((d) => {
  const win = districtWindow(d);
  return { id: d.id, name: d.name, lat: d.lat, lon: d.lon, streetCells: 0, ...win, bits: "" };
});
const buffers = new Map(out.map((d) => [d.id, new Uint8Array(Math.ceil((DISTRICT_SIDE * DISTRICT_SIDE) / 8))]));
let outside = 0;
for (const key of cells) {
  const i = key.indexOf(":");
  const row = +key.slice(0, i), col = +key.slice(i + 1);
  const id = nearestDistrictId(cellCenter(row, col));
  if (!id) { outside++; continue; }
  const d = out.find((x) => x.id === id)!;
  const idx = bitIndex(d, row, col);
  if (idx < 0) { outside++; continue; }
  const buf = buffers.get(id)!;
  if (!(buf[idx >> 3] & (1 << (idx & 7)))) { buf[idx >> 3] |= 1 << (idx & 7); d.streetCells++; }
}
for (const d of out) d.bits = Buffer.from(buffers.get(d.id)!).toString("base64");

await writeFile("data/districts.json", JSON.stringify(out) + "\n");
console.log(`data/districts.json: ${out.length} районов, уличных ячеек ${out.reduce((s, d) => s + d.streetCells, 0)}, вне районов ${outside}`);
for (const d of out) console.log(`  ${d.name}: ${d.streetCells}`);
