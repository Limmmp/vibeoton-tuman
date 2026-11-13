// Туман войны: набор открытых ячеек + слой на карте.
//
// Слой — canvas-источник MapLibre. Он «драпируется» по рельефу, поэтому туман лежит на склонах сопок.
// Холст покрывает окно вокруг текущего вида (с запасом) и перерисовывается при движении/открытии ячеек.
// Всё, что за окном, закрывает однотонная заливка «мир минус окно» того же цвета.

import maplibregl, { type Map as MLMap, type CanvasSource, type GeoJSONSource } from "maplibre-gl";
import { CELL, cellsInRadius, cellCenter, cellOf, cellKey, cellRowHeightDeg, cellColWidthDeg, distance, lerp, type LatLon } from "./geo";
import { load, save, debounced } from "./storage";
import type { RenderProfile } from "./performance";

export const REVEAL_RADIUS = 45; // м вокруг игрока

// Цвет тумана: молочно-серый, почти непрозрачный — рельеф угадывается по форме, улицы не читаются.
const FOG_RGB = [176, 186, 198];
const FOG_ALPHA = 0.9;

// Если вид шире этого (м), холст покрывает весь город целиком, а не окно вокруг вида.
const MAX_WINDOW_SPAN = 9000;
const CITY_BBOX = { w: 131.72, s: 42.93, e: 132.18, n: 43.32 }; // Владивосток с Русским островом
const DEFAULT_MAX_CANVAS = 2048;

type Listener = (fresh: number) => void;

export class FogOfWar {
  readonly cells: Set<string>;
  private listeners: Listener[] = [];
  private persist = debounced(() => save("fog", [...this.cells]), 2000);

  constructor() {
    this.cells = new Set(load<string[]>("fog", []));
  }

  onChange(fn: Listener) {
    this.listeners.push(fn);
  }

  isRevealed(p: LatLon): boolean {
    const { row, col } = cellOf(p);
    return this.cells.has(cellKey(row, col));
  }

  /** Открыть круг вокруг точки. Возвращает число новых ячеек. */
  reveal(p: LatLon, radius = REVEAL_RADIUS): number {
    let fresh = 0;
    for (const k of cellsInRadius(p, radius)) {
      if (!this.cells.has(k)) {
        this.cells.add(k);
        fresh++;
      }
    }
    if (fresh) {
      this.persist();
      this.listeners.forEach((fn) => fn(fresh));
    }
    return fresh;
  }

  /** Открыть «коридор» между точками, чтобы между редкими фиксами GPS не оставалось дыр. */
  revealPath(a: LatLon, b: LatLon, radius = REVEAL_RADIUS): number {
    const d = distance(a, b);
    if (d > 2000) return this.reveal(b, radius); // скачок GPS или телепорт — без полосы через весь город
    const steps = Math.max(1, Math.ceil(d / (radius * 0.6)));
    let added = 0;
    for (let i = 1; i <= steps; i++) added += this.reveal(lerp(a, b, i / steps), radius);
    return added;
  }

  areaKm2(): number {
    return (this.cells.size * CELL * CELL) / 1e6;
  }

  reset() {
    this.cells.clear();
    save("fog", []);
    this.listeners.forEach((fn) => fn(0));
  }
}

// ---------------- Слой на карте ----------------

type Win = { w: number; s: number; e: number; n: number };

export class FogLayer {
  private canvas = document.createElement("canvas");
  private mask = document.createElement("canvas");
  private pattern = makePattern();
  private lastDraw = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private map: MLMap, private fog: FogOfWar, beforeId?: string, private profile?: RenderProfile) {
    this.canvas.width = this.canvas.height = 2;
    const coords = toCoords(CITY_BBOX);
    map.addSource("fog-canvas", { type: "canvas", canvas: this.canvas, coordinates: coords, animate: false });
    map.addSource("fog-outer", { type: "geojson", data: outerPolygon(CITY_BBOX) });
    const color = `rgb(${FOG_RGB.join(",")})`;
    map.addLayer({ id: "fog-outer", type: "fill", source: "fog-outer", paint: { "fill-color": color, "fill-opacity": FOG_ALPHA, "fill-antialias": false } }, beforeId);
    map.addLayer({ id: "fog", type: "raster", source: "fog-canvas", paint: { "raster-fade-duration": 0, "raster-resampling": "linear" } }, beforeId);

    map.on("moveend", () => this.schedule());
    map.on("resize", () => this.schedule());
    fog.onChange(() => this.schedule());
    this.schedule();
  }

  /** Не чаще ~8 раз в секунду: при следовании камеры за игроком moveend идёт каждый кадр. */
  schedule() {
    if (this.timer) return;
    const wait = Math.max(0, (this.profile?.fogIntervalMs ?? 120) - (performance.now() - this.lastDraw));
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.lastDraw = performance.now();
      this.draw();
    }, wait);
  }

  private pickWindow(): Win {
    const b = this.map.getBounds();
    const c = this.map.getCenter();
    let w = b.getWest(), e = b.getEast(), s = b.getSouth(), n = b.getNorth();
    const spanM = distance({ lat: s, lon: w }, { lat: n, lon: e });
    if (spanM > MAX_WINDOW_SPAN) return CITY_BBOX;
    // Запас 30% с каждой стороны, чтобы при небольших сдвигах не было видно края.
    const padX = (e - w) * 0.3, padY = (n - s) * 0.3;
    w -= padX; e += padX; s -= padY; n += padY;
    // При сильном наклоне камеры дальний край вида огромен — ограничиваем окно вокруг центра.
    const lim = MAX_WINDOW_SPAN / 2;
    const dLat = lim / 111320, dLon = lim / (111320 * Math.cos((c.lat * Math.PI) / 180));
    return { w: Math.max(w, c.lng - dLon), e: Math.min(e, c.lng + dLon), s: Math.max(s, c.lat - dLat), n: Math.min(n, c.lat + dLat) };
  }

  private draw() {
    const win = this.pickWindow();
    const m0 = maplibregl.MercatorCoordinate.fromLngLat([win.w, win.n]);
    const m1 = maplibregl.MercatorCoordinate.fromLngLat([win.e, win.s]);
    const mw = m1.x - m0.x, mh = m1.y - m0.y;

    // Размер холста: по экрану с запасом, но не больше MAX_CANVAS, с сохранением пропорций.
    const dpr = this.profile?.pixelRatio ?? Math.min(window.devicePixelRatio || 1, 2);
    const target = Math.min(this.profile?.fogMaxCanvas ?? DEFAULT_MAX_CANVAS, Math.max(this.map.getCanvas().clientWidth, this.map.getCanvas().clientHeight) * dpr * (this.profile?.fogScale ?? 1.6));
    const W = Math.max(2, Math.round(mw >= mh ? target : (target * mw) / mh));
    const H = Math.max(2, Math.round(mh > mw ? target : (target * mh) / mw));

    const toPx = (p: LatLon) => {
      const m = maplibregl.MercatorCoordinate.fromLngLat([p.lon, p.lat]);
      return { x: ((m.x - m0.x) / mw) * W, y: ((m.y - m0.y) / mh) * H };
    };
    const midLat = (win.n + win.s) / 2;
    const metersPerPx = (mw / W) / maplibregl.MercatorCoordinate.fromLngLat([win.w, midLat]).meterInMercatorCoordinateUnits();
    const r = Math.max(0.8, (CELL * 0.75) / metersPerPx);

    // --- маска открытых ячеек ---
    const mask = this.mask;
    mask.width = W; mask.height = H;
    const g = mask.getContext("2d")!;
    g.fillStyle = "#000";
    g.beginPath();
    const rh = cellRowHeightDeg();
    const rowMin = Math.floor(win.s / rh) - 1, rowMax = Math.floor(win.n / rh) + 1;
    const add = (row: number, col: number) => {
      const pt = toPx(cellCenter(row, col));
      g.moveTo(pt.x + r, pt.y);
      g.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    };
    const estCells = (rowMax - rowMin) * ((win.e - win.w) / cellColWidthDeg(rowMin));
    if (estCells < this.fog.cells.size) {
      for (let row = rowMin; row <= rowMax; row++) {
        const cw = cellColWidthDeg(row);
        for (let col = Math.floor(win.w / cw) - 1; col <= Math.floor(win.e / cw) + 1; col++) {
          if (this.fog.cells.has(`${row}:${col}`)) add(row, col);
        }
      }
    } else {
      for (const k of this.fog.cells) {
        const i = k.indexOf(":");
        const row = +k.slice(0, i);
        if (row >= rowMin && row <= rowMax) add(row, +k.slice(i + 1));
      }
    }
    g.fill();

    // --- сам туман: шумовая заливка минус размытая маска ---
    const cv = this.canvas;
    cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = ctx.createPattern(this.pattern, "repeat")!;
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = "destination-out";
    ctx.filter = `blur(${Math.max(1.5, r * 0.9)}px)`;
    ctx.drawImage(mask, 0, 0);
    ctx.filter = "none";
    ctx.globalCompositeOperation = "source-over";

    // --- обновить источники ---
    const src = this.map.getSource("fog-canvas") as CanvasSource | undefined;
    if (!src) return;
    src.setCoordinates(toCoords(win));
    // Неанимированный canvas-источник перезаливает текстуру только при play(): включаем на один кадр.
    src.play();
    this.map.once("render", () => src.pause());
    this.map.triggerRepaint();
    (this.map.getSource("fog-outer") as GeoJSONSource | undefined)?.setData(outerPolygon(win));
  }
}

function toCoords(b: Win): [[number, number], [number, number], [number, number], [number, number]] {
  return [[b.w, b.n], [b.e, b.n], [b.e, b.s], [b.w, b.s]];
}

/** Полигон «весь мир, кроме окна». */
function outerPolygon(b: Win): GeoJSON.Feature<GeoJSON.Polygon> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [
        [[-180, -85], [180, -85], [180, 85], [-180, 85], [-180, -85]],
        [[b.w, b.s], [b.w, b.n], [b.e, b.n], [b.e, b.s], [b.w, b.s]],
      ],
    },
  };
}

/** Шумовая текстура, чтобы туман был «дымным», а не плоской заливкой. */
function makePattern(): HTMLCanvasElement {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  const img = g.createImageData(s, s);
  for (let i = 0; i < s * s; i++) {
    const n = (Math.random() - 0.5) * 14;
    img.data[i * 4] = FOG_RGB[0] + n;
    img.data[i * 4 + 1] = FOG_RGB[1] + n;
    img.data[i * 4 + 2] = FOG_RGB[2] + n;
    img.data[i * 4 + 3] = Math.round(255 * (FOG_ALPHA + (Math.random() - 0.5) * 0.04));
  }
  g.putImageData(img, 0, 0);
  return c;
}
