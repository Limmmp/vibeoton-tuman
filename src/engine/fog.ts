// Туман войны: набор открытых ячеек + слой на карте.
//
// Слой — canvas-источник MapLibre. Он «драпируется» по рельефу, поэтому туман лежит на склонах сопок.
// Холст покрывает окно вокруг текущего вида (с запасом) и перерисовывается при движении/открытии ячеек.
// Всё, что за окном, закрывает однотонная заливка «мир минус окно» того же цвета.

import maplibregl, { type Map as MLMap, type CanvasSource, type GeoJSONSource } from "maplibre-gl";
import { CELL, cellsInRadius, cellCenter, cellOf, cellKey, distance, lerp, type LatLon } from "./geo";
import { FogCellIndex } from "./fog-index";
import { load, save, debounced } from "./storage";
import type { RenderProfile } from "./performance";

export const REVEAL_RADIUS = 45; // м вокруг игрока

// Цвет тумана: молочно-серый, почти непрозрачный — рельеф угадывается по форме, улицы не читаются.
const FOG_RGB = [176, 186, 198];
const FOG_ALPHA = 0.9;

// Если вид шире этого (м), холст покрывает весь город целиком, а не окно вокруг вида.
const MAX_WINDOW_SPAN = 9000;
const CITY_BBOX = { w: 131.72, s: 42.93, e: 132.18, n: 43.32 }; // Владивосток с Русским островом
// keys — ключи только что открытых ячеек (пусто при сбросе тумана).
type Listener = (fresh: number, keys: string[]) => void;

export class FogOfWar {
  readonly cells: Set<string>;
  readonly index = new FogCellIndex();
  private listeners: Listener[] = [];
  private persist = debounced(() => save("fog", [...this.cells]), 2000);

  constructor() {
    this.cells = new Set(load<string[]>("fog", []));
    for (const key of this.cells) this.index.add(key);
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
    const keys: string[] = [];
    for (const k of cellsInRadius(p, radius)) {
      if (!this.cells.has(k)) {
        this.cells.add(k);
        this.index.add(k);
        keys.push(k);
      }
    }
    if (keys.length) {
      this.persist();
      this.listeners.forEach((fn) => fn(keys.length, keys));
    }
    return keys.length;
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
    this.index.clear();
    save("fog", []);
    this.listeners.forEach((fn) => fn(0, []));
  }
}

// ---------------- Слой на карте ----------------

type Win = { w: number; s: number; e: number; n: number };

export class FogLayer {
  private canvas = document.createElement("canvas");
  private mask = document.createElement("canvas");
  private pattern = makePattern();
  private billows: HTMLCanvasElement | undefined;
  private effects = true;
  private suspended = false;
  private cut = document.createElement("canvas"); // размытая маска открытых ячеек — готова к вычитанию
  private win: Win = CITY_BBOX;
  private lastDraw = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private breathTimer: ReturnType<typeof setInterval> | undefined;
  private t0 = performance.now();

  constructor(private map: MLMap, private fog: FogOfWar, beforeId: string | undefined, private profile: RenderProfile) {
    this.canvas.width = this.canvas.height = 2;
    const coords = toCoords(CITY_BBOX);
    map.addSource("fog-canvas", { type: "canvas", canvas: this.canvas, coordinates: coords, animate: false });
    map.addSource("fog-outer", { type: "geojson", data: outerPolygon(CITY_BBOX) });
    const color = `rgb(${FOG_RGB.join(",")})`;
    map.addLayer({ id: "fog-outer", type: "fill", source: "fog-outer", paint: { "fill-color": color, "fill-opacity": FOG_ALPHA, "fill-antialias": false } }, beforeId);
    map.addLayer({ id: "fog", type: "raster", source: "fog-canvas", paint: { "raster-fade-duration": 0, "raster-resampling": "linear" } }, beforeId);

    // Облачка на границе тумана: мягкие пятна-билборды на туманной стороне, приподнятые над землёй.
    map.addImage("fog-puff", makePuff());
    map.addSource("fog-puffs", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
    map.addLayer({
      id: "fog-puffs", type: "symbol", source: "fog-puffs", minzoom: 14,
      layout: {
        "icon-image": "fog-puff",
        "icon-size": ["interpolate", ["linear"], ["zoom"], 14, 0.55, 17, 1.1, 19, 1.6],
        "icon-allow-overlap": true, "icon-ignore-placement": true,
        "icon-pitch-alignment": "viewport", "icon-rotation-alignment": "viewport",
        "icon-offset": [0, -14],
      },
      paint: { "icon-opacity": ["interpolate", ["linear"], ["zoom"], 14, 0.35, 16, 0.75] },
    }, beforeId);

    map.on("moveend", () => this.schedule());
    map.on("resize", () => this.schedule());
    fog.onChange((_fresh, keys) => {
      if (!keys.length || keys.some(key => {
        const [row, col] = key.split(":").map(Number);
        const point = cellCenter(row, col);
        const pad = CELL * 3 / 111320;
        return point.lat >= this.win.s - pad && point.lat <= this.win.n + pad && point.lon >= this.win.w - pad * 2 && point.lon <= this.win.e + pad * 2;
      })) this.schedule();
    });
    this.schedule();
    this.startBreathing();
  }

  /** «Дыхание»: шум тумана медленно плывёт. Только на medium/high; на low туман статичный. */
  private startBreathing() {
    clearInterval(this.breathTimer);
    this.breathTimer = undefined;
    const on = this.effects && this.profile.quality !== "low";
    if (this.map.getLayer("fog-puffs")) this.map.setLayoutProperty("fog-puffs", "visibility", on ? "visible" : "none");
    if (!on || this.suspended) return;
    this.breathTimer = setInterval(() => {
      if (document.hidden) return;
      this.composite();
      // Облачка чуть колышутся.
      const t = (performance.now() - this.t0) / 1000;
      this.map.setPaintProperty("fog-puffs", "icon-translate", [Math.sin(t * 0.6) * 3, Math.cos(t * 0.45) * 2]);
    }, Math.max(250, this.profile.fogIntervalMs));
  }

  setEffects(enabled: boolean) {
    this.effects = enabled;
    this.startBreathing();
    this.schedule();
  }

  setSuspended(suspended: boolean) {
    this.suspended = suspended;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.startBreathing();
    if (!suspended) this.schedule();
  }

  setProfile(profile: RenderProfile) {
    this.profile = profile;
    clearTimeout(this.timer);
    this.timer = undefined;
    this.lastDraw = 0;
    this.schedule();
    this.startBreathing();
  }

  /** Частота зависит от профиля качества. */
  schedule() {
    if (this.timer || this.suspended) return;
    const wait = Math.max(0, this.profile.fogIntervalMs - (performance.now() - this.lastDraw));
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
    const target = Math.min(this.profile.fogMaxCanvas, Math.max(this.map.getCanvas().clientWidth, this.map.getCanvas().clientHeight) * this.profile.pixelRatio * this.profile.fogScale);
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
    const add = (row: number, col: number) => {
      const pt = toPx(cellCenter(row, col));
      g.moveTo(pt.x + r, pt.y);
      g.arc(pt.x, pt.y, r, 0, Math.PI * 2);
    };
    for (const [row, col] of this.fog.index.inWindow(win)) add(row, col);
    g.fill();

    // --- размытая маска: считается только здесь, «дыхание» её переиспользует ---
    const cut = this.cut;
    cut.width = W; cut.height = H;
    const cg = cut.getContext("2d")!;
    cg.filter = `blur(${Math.max(1.5, r * 0.9)}px)`;
    cg.drawImage(mask, 0, 0);
    cg.filter = "none";
    this.win = win;
    this.composite();
    (this.map.getSource("fog-outer") as GeoJSONSource | undefined)?.setData(outerPolygon(win));
    if (this.effects && this.profile.quality !== "low") this.updatePuffs(win);
  }

  /** Туман = шум (со сдвигом во времени) + крупные клубы − размытая маска. Дёшево: без пересчёта маски. */
  private composite() {
    const W = this.cut.width, H = this.cut.height;
    if (W < 2 || H < 2) return;
    const cv = this.canvas;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    const ctx = cv.getContext("2d")!;
    const t = (performance.now() - this.t0) / 1000;
    const breathing = this.effects && this.profile.quality !== "low";
    const pat = ctx.createPattern(this.pattern, "repeat")!;
    if (breathing) pat.setTransform(new DOMMatrix().translate((t * 6) % 256, (Math.sin(t * 0.3) * 12) % 256));
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    if (breathing) {
      // Крупные мягкие клубы медленно плывут в другую сторону — туман «дышит» неравномерно.
      const bp = ctx.createPattern(this.billows ??= makeBillows(), "repeat")!;
      bp.setTransform(new DOMMatrix().translate((-t * 9) % 512, (t * 4) % 512));
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = bp;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    ctx.globalCompositeOperation = "destination-out";
    ctx.drawImage(this.cut, 0, 0);
    ctx.globalCompositeOperation = "source-over";

    const src = this.map.getSource("fog-canvas") as CanvasSource | undefined;
    if (!src) return;
    src.setCoordinates(toCoords(this.win));
    // Неанимированный canvas-источник перезаливает текстуру только при play(): включаем на один кадр.
    src.play();
    this.map.once("render", () => src.pause());
    this.map.triggerRepaint();
  }

  /** Облачка: центры закрытых ячеек, соседних с открытыми, в окне вида; не больше MAX_PUFFS. */
  private updatePuffs(win: Win) {
    const cells = this.fog.cells;
    const pts: [number, number][] = [];
    const seen = new Set<string>();
    for (const [row, col] of this.fog.index.inWindow(win, 2)) {
      for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nk = `${row + dr}:${col + dc}`;
        if (cells.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        const c = cellCenter(row + dr, col + dc);
        if (c.lon >= win.w && c.lon <= win.e && c.lat >= win.s && c.lat <= win.n) pts.push([c.lon, c.lat]);
      }
    }
    const step = Math.max(1, Math.ceil(pts.length / MAX_PUFFS));
    const features = pts.filter((_, i) => i % step === 0).map((c) => ({ type: "Feature" as const, properties: {}, geometry: { type: "Point" as const, coordinates: c } }));
    (this.map.getSource("fog-puffs") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features });
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

const MAX_PUFFS = 150;

/** Мягкое пятно тумана для облачков (белое, прозрачные края). */
function makePuff(): ImageData {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  for (const [x, y, r, a] of [[32, 36, 26, 0.55], [22, 30, 16, 0.4], [42, 28, 18, 0.4]] as const) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${FOG_RGB.join(",")},${a})`);
    grad.addColorStop(1, `rgba(${FOG_RGB.join(",")},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  }
  return g.getImageData(0, 0, s, s);
}

/** Крупные мягкие клубы (бесшовная текстура 512 px) — вторая, медленная составляющая «дыхания». */
function makeBillows(): HTMLCanvasElement {
  const s = 512;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const g = c.getContext("2d")!;
  let seed = 11;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < 40; i++) {
    const x = rand() * s, y = rand() * s, r = 40 + rand() * 90;
    const light = rand() < 0.5;
    // Рисуем с переносом через края, чтобы текстура была бесшовной.
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, light ? "rgba(225,232,240,0.35)" : "rgba(120,132,148,0.3)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, r * 2, r * 2);
    }
  }
  return c;
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
