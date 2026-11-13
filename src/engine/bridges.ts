// Мосты и высоты на маршруте.
// Тайлы высот дают высоту земли или воды, а не полотна моста: под Золотым мостом там ~0 м,
// хотя дорога идёт на высоте ~60–70 м. Без поправки маршрут через мост «ныряет» к уровню моря
// и снова «взлетает» — в профиле появляются фальшивые +60 м подъёма.
// Поправка: точки маршрута на мосту получают высоту по прямой между концами моста.
// Чистая логика без сети — данные мостов (data/bridges.json) передаются снаружи.

import type { LatLon } from "./geo.ts";

export type BridgeData = { id: number; name: string | null; len: number; line: [number, number][] };

const NEAR = 14; // м — точка маршрута ближе этого к оси моста считается «на мосту»
const M_LAT = 111320;

type Seg = { ax: number; ay: number; bx: number; by: number; minX: number; maxX: number; minY: number; maxY: number };

export class BridgeIndex {
  private segs: Seg[] = [];
  private lat0: number;

  constructor(bridges: BridgeData[], lat0 = 43.1) {
    this.lat0 = lat0;
    for (const b of bridges) {
      for (let i = 1; i < b.line.length; i++) {
        const [ax, ay] = this.xy(b.line[i - 1][1], b.line[i - 1][0]);
        const [bx, by] = this.xy(b.line[i][1], b.line[i][0]);
        this.segs.push({ ax, ay, bx, by, minX: Math.min(ax, bx) - NEAR, maxX: Math.max(ax, bx) + NEAR, minY: Math.min(ay, by) - NEAR, maxY: Math.max(ay, by) + NEAR });
      }
    }
  }

  /** Плоские метры (x — на восток, y — на север) от нулевого меридиана; точности хватает в пределах города. */
  private xy(lat: number, lon: number): [number, number] {
    return [lon * M_LAT * Math.cos((this.lat0 * Math.PI) / 180), lat * M_LAT];
  }

  isOnBridge(p: LatLon): boolean {
    const [x, y] = this.xy(p.lat, p.lon);
    for (const s of this.segs) {
      if (x < s.minX || x > s.maxX || y < s.minY || y > s.maxY) continue;
      const dx = s.bx - s.ax, dy = s.by - s.ay;
      const len2 = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / len2));
      const px = s.ax + t * dx - x, py = s.ay + t * dy - y;
      if (px * px + py * py <= NEAR * NEAR) return true;
    }
    return false;
  }
}

/**
 * Заменить высоты точек на мосту прямой между последней точкой до моста и первой после.
 * heights и onBridge — по точкам маршрута; d — расстояние от начала (м). Возвращает новый массив.
 */
export function flattenBridges(heights: number[], onBridge: boolean[], d: number[]): number[] {
  const out = heights.slice();
  let i = 0;
  while (i < out.length) {
    if (!onBridge[i]) { i++; continue; }
    let j = i;
    while (j < out.length && onBridge[j]) j++;
    const left = i - 1, right = j; // опорные точки на берегу
    const hl = left >= 0 ? out[left] : right < out.length ? out[right] : out[i];
    const hr = right < out.length ? out[right] : hl;
    const dl = left >= 0 ? d[left] : d[i], dr = right < out.length ? d[right] : d[j - 1];
    for (let k = i; k < j; k++) out[k] = dr > dl ? hl + ((hr - hl) * (d[k] - dl)) / (dr - dl) : hl;
    i = j;
  }
  return out;
}
