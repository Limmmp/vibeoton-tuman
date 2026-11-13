// Пешие маршруты с профилем высот.
// Геометрия — OSRM (пешеходный профиль), высоты — из тайлов рельефа (dem.ts).

import { distance, lerp, type LatLon } from "./geo";
import { elevationAt } from "./dem";

const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const STEP = 10; // м — шаг выборки высот
const SMOOTH = 5; // окно сглаживания (×STEP м), чтобы шум рельефа не давал ложных подъёмов

export type RouteResult = {
  path: LatLon[];
  distance: number; // м
  climb: number; // суммарный подъём, м
  descent: number; // суммарный спуск, м
  minutes: number; // время пешком с учётом уклонов
  profile: { d: number; h: number }[]; // расстояние от начала, высота
};

async function osrm(from: LatLon, to: LatLon): Promise<LatLon[]> {
  const url = `${OSRM}/${from.lon},${from.lat};${to.lon},${to.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Маршрутизатор ответил ${r.status}`);
  const j = await r.json();
  const coords: [number, number][] | undefined = j.routes?.[0]?.geometry?.coordinates;
  if (!coords?.length) throw new Error("Маршрут не найден");
  return coords.map(([lon, lat]) => ({ lat, lon }));
}

/** Точки через каждые STEP метров вдоль линии. */
function resample(path: LatLon[]): { p: LatLon; d: number }[] {
  const out = [{ p: path[0], d: 0 }];
  let total = 0, next = STEP;
  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1], b = path[i];
    const seg = distance(a, b);
    while (seg > 0 && next <= total + seg) {
      out.push({ p: lerp(a, b, (next - total) / seg), d: next });
      next += STEP;
    }
    total += seg;
  }
  const last = path[path.length - 1];
  if (out[out.length - 1].d < total) out.push({ p: last, d: total });
  return out;
}

/** Скорость пешехода по Тоблеру, км/ч, от уклона (dh/dx). */
const tobler = (slope: number) => 6 * Math.exp(-3.5 * Math.abs(slope + 0.05));

export async function profileOf(path: LatLon[]): Promise<Omit<RouteResult, "path">> {
  const pts = resample(path);
  const raw = await Promise.all(pts.map((s) => elevationAt(s.p)));
  // Пропуски (нет тайла) заполняем соседними значениями.
  let lastKnown = raw.find((h) => h != null) ?? 0;
  const hs = raw.map((h) => (h == null ? lastKnown : (lastKnown = h)));
  const half = Math.floor(SMOOTH / 2);
  const sm = hs.map((_, i) => {
    let s = 0, n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(hs.length - 1, i + half); k++) { s += hs[k]; n++; }
    return s / n;
  });
  let climb = 0, descent = 0, hours = 0;
  for (let i = 1; i < sm.length; i++) {
    const dh = sm[i] - sm[i - 1];
    const dx = pts[i].d - pts[i - 1].d;
    if (dh > 0) climb += dh; else descent -= dh;
    if (dx > 0) hours += dx / 1000 / tobler(dh / dx);
  }
  return {
    distance: pts[pts.length - 1].d,
    climb: Math.round(climb),
    descent: Math.round(descent),
    minutes: Math.max(1, Math.round(hours * 60)),
    profile: pts.map((s, i) => ({ d: Math.round(s.d), h: Math.round(sm[i] * 10) / 10 })),
  };
}

export async function routeWithElevation(from: LatLon, to: LatLon): Promise<RouteResult> {
  const path = await osrm(from, to);
  return { path, ...(await profileOf(path)) };
}
