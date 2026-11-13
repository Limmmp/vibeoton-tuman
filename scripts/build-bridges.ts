// Собрать data/bridges.json: оси пешеходно-проезжих мостов Владивостока (OSM bridge=yes, длиннее 40 м).
// Нужны, чтобы маршрут через мост не «нырял» к уровню воды: тайлы высот дают высоту земли/воды,
// а не полотна моста (см. src/engine/route.ts). Запуск: npm run data:bridges (разово; результат коммитится).

import { writeFile } from "node:fs/promises";
import { distance, type LatLon } from "../src/engine/geo.ts";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const BBOX = "42.93,131.72,43.32,132.18";
const MIN_LEN = 40; // м

const q = `[out:json][timeout:120];way["bridge"~"^(yes|viaduct|cantilever|suspension|cable-stayed)$"]["highway"](${BBOX});out tags geom qt;`;
let r: Response | null = null;
for (let attempt = 0; attempt < 5 && !r?.ok; attempt++) {
  if (attempt) { console.warn(`Overpass ${r?.status}, повтор через 20 с`); await new Promise((res) => setTimeout(res, 20000)); }
  r = await fetch(OVERPASS, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "tuman-vladivostok-hackathon/0.1" }, body: "data=" + encodeURIComponent(q) });
}
if (!r?.ok) throw new Error(`Overpass ${r?.status}`);
const els = ((await r.json()) as { elements: { id: number; tags?: Record<string, string>; geometry?: LatLon[] }[] }).elements;

const out = [];
for (const el of els) {
  const g = (el.geometry ?? []).map((p) => [+p.lon.toFixed(6), +p.lat.toFixed(6)] as [number, number]);
  let len = 0;
  for (let i = 1; i < g.length; i++) len += distance({ lat: g[i - 1][1], lon: g[i - 1][0] }, { lat: g[i][1], lon: g[i][0] });
  if (len < MIN_LEN) continue;
  out.push({ id: el.id, name: el.tags?.name ?? el.tags?.["bridge:name"] ?? null, len: Math.round(len), line: g });
}
out.sort((a, b) => b.len - a.len);
await writeFile("data/bridges.json", JSON.stringify(out) + "\n");
console.log(`data/bridges.json: ${out.length} мостов; крупнейшие: ${out.slice(0, 6).map((b) => `${b.name ?? "без названия"} ${b.len} м`).join(", ")}`);
process.exit(0);
