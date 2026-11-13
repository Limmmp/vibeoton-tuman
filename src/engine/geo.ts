// Геометрия: расстояния, азимуты, сетка тумана.
// Сетка совместима с прежней версией «Тумана»: ключи ячеек "row:col" те же,
// поэтому старый прогресс можно перенести.

export type LatLon = { lat: number; lon: number };

export const EARTH_R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;
const toDeg = (r: number) => (r * 180) / Math.PI;

/** Расстояние между точками в метрах (haversine). */
export function distance(a: LatLon, b: LatLon): number {
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(s));
}

/** Азимут a→b в градусах (0 = север, по часовой). */
export function bearing(a: LatLon, b: LatLon): number {
  const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Сместить точку на meters по азимуту deg (плоское приближение, для коротких отрезков). */
export function move(p: LatLon, deg: number, meters: number): LatLon {
  const dNorth = Math.cos(toRad(deg)) * meters;
  const dEast = Math.sin(toRad(deg)) * meters;
  return {
    lat: p.lat + toDeg(dNorth / EARTH_R),
    lon: p.lon + toDeg(dEast / (EARTH_R * Math.cos(toRad(p.lat)))),
  };
}

export function lerp(a: LatLon, b: LatLon, t: number): LatLon {
  return { lat: a.lat + (b.lat - a.lat) * t, lon: a.lon + (b.lon - a.lon) * t };
}

// ---------- Сетка тумана ----------
// Строка зависит только от широты, столбец — от долготы с поправкой на широту строки,
// так что ячейки примерно квадратные (CELL × CELL метров), а ключи стабильны.
export const CELL = 20;
const M_PER_DEG_LAT = 111320;
const ROW_H = CELL / M_PER_DEG_LAT;

export const cellRowHeightDeg = () => ROW_H;
export function cellColWidthDeg(row: number): number {
  const lat = (row + 0.5) * ROW_H;
  return CELL / (M_PER_DEG_LAT * Math.cos(toRad(lat)));
}
export function cellOf(p: LatLon) {
  const row = Math.floor(p.lat / ROW_H);
  return { row, col: Math.floor(p.lon / cellColWidthDeg(row)) };
}
export const cellKey = (row: number, col: number) => `${row}:${col}`;
export function cellCenter(row: number, col: number): LatLon {
  return { lat: (row + 0.5) * ROW_H, lon: (col + 0.5) * cellColWidthDeg(row) };
}

/** Ключи всех ячеек, центр которых в радиусе radius метров от точки. */
export function cellsInRadius(p: LatLon, radius: number): string[] {
  const out: string[] = [];
  const n = Math.ceil(radius / CELL) + 1;
  const { row: r0 } = cellOf(p);
  for (let r = r0 - n; r <= r0 + n; r++) {
    const w = cellColWidthDeg(r);
    const c0 = Math.floor(p.lon / w);
    for (let c = c0 - n; c <= c0 + n; c++) {
      if (distance(p, { lat: (r + 0.5) * ROW_H, lon: (c + 0.5) * w }) <= radius) out.push(cellKey(r, c));
    }
  }
  return out;
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} м` : `${(m / 1000).toFixed(1)} км`;
}
