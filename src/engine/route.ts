// Пешие маршруты с профилем высот.
// Геометрия — OSRM (пешеходный профиль), высоты — из тайлов рельефа (dem.ts).

import { bearing, distance, lerp, move, type LatLon } from "./geo";
import { pickRoutes } from "./route-pick";
import { elevationAt } from "./dem";
import { BridgeIndex, flattenBridges, type BridgeData } from "./bridges";
import bridgesJson from "../../data/bridges.json";

const bridges = new BridgeIndex(bridgesJson as BridgeData[]);

const OSRM = "https://routing.openstreetmap.de/routed-foot/route/v1/foot";
const STEP = 10; // м — шаг выборки высот
const SMOOTH = 5; // окно сглаживания (×STEP м), чтобы шум рельефа не давал ложных подъёмов
const GRADE_WINDOW = 5; // ×STEP м — уклон считаем на 50 м, чтобы одна ступенька рельефа не давала пик
export const STEEP = 0.12; // 12 % — заметно круто для пешехода

export type RouteResult = {
  path: LatLon[];
  distance: number; // м
  climb: number; // суммарный подъём, м
  descent: number; // суммарный спуск, м
  minutes: number; // время пешком с учётом уклонов
  steep: number; // м пути с уклоном круче STEEP — тяжело с коляской, после тренировки, пожилым
  maxGrade: number; // самый крутой участок, % (по окну GRADE_WINDOW)
  profile: { d: number; h: number }[]; // расстояние от начала, высота
};

async function osrm(points: LatLon[], alternatives = false): Promise<LatLon[][]> {
  const coords = points.map((p) => `${p.lon},${p.lat}`).join(";");
  const url = `${OSRM}/${coords}?overview=full&geometries=geojson${alternatives ? "&alternatives=3" : ""}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Маршрутизатор ответил ${r.status}`);
  const j = await r.json();
  const routes: { geometry?: { coordinates?: [number, number][] } }[] = j.routes ?? [];
  const paths = routes
    .map((route) => route.geometry?.coordinates ?? [])
    .filter((c) => c.length > 1)
    .map((c) => c.map(([lon, lat]) => ({ lat, lon })));
  if (!paths.length) throw new Error("Маршрут не найден");
  return paths;
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
  const filled = raw.map((h) => (h == null ? lastKnown : (lastKnown = h)));
  // На мостах тайлы дают высоту воды — берём высоту по прямой между берегами (см. bridges.ts).
  const hs = flattenBridges(filled, pts.map((s) => bridges.isOnBridge(s.p)), pts.map((s) => s.d));
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
  let steep = 0, maxGrade = 0;
  for (let i = GRADE_WINDOW; i < sm.length; i++) {
    const dx = pts[i].d - pts[i - GRADE_WINDOW].d;
    if (dx <= 0) continue;
    const grade = Math.abs(sm[i] - sm[i - GRADE_WINDOW]) / dx;
    maxGrade = Math.max(maxGrade, grade);
    if (grade > STEEP) steep += pts[i].d - pts[i - 1].d;
  }
  return {
    distance: pts[pts.length - 1].d,
    climb: Math.round(climb),
    steep: Math.round(steep),
    maxGrade: Math.round(maxGrade * 100),
    descent: Math.round(descent),
    minutes: Math.max(1, Math.round(hours * 60)),
    profile: pts.map((s, i) => ({ d: Math.round(s.d), h: Math.round(sm[i] * 10) / 10 })),
  };
}

export async function routeWithElevation(from: LatLon, to: LatLon): Promise<RouteResult> {
  const [path] = await osrm([from, to]);
  return { path, ...(await profileOf(path)) };
}

export type RouteOptions = { short: RouteResult; gentle: RouteResult | null };

/**
 * Короткий и пологий маршруты. Владивосток стоит на сопках: суммарный подъём почти
 * неизбежен (точки на разной высоте), а вот крутые участки часто можно обойти.
 * Кандидаты — альтернативы OSRM и объезды через точки слева и справа от середины пути;
 * пологий выбирается по длине крутых участков и самому крутому месту (route-pick.ts).
 */
export async function routeOptions(from: LatLon, to: LatLon): Promise<RouteOptions> {
  const d = distance(from, to);
  const mid = lerp(from, to, 0.5);
  const side = Math.min(600, Math.max(150, d * 0.3));
  const course = bearing(from, to);
  const vias = d > 250 ? [move(mid, course + 90, side), move(mid, course - 90, side)] : [];
  const results = await Promise.allSettled([
    osrm([from, to], true),
    ...vias.map((via) => osrm([from, via, to]).then((paths) => paths.slice(0, 1))),
  ]);
  const main = results[0];
  if (main.status === "rejected") throw main.reason;
  const paths = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const candidates = await Promise.all(paths.map(async (path) => ({ path, ...(await profileOf(path)) })));
  return pickRoutes(candidates);
}
