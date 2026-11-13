// Высоты рельефа как данные (а не только картинка): читаем тайлы Terrarium напрямую.
// Нужны для набора высоты на маршрутах, фильтра «без подъёма» и достижений.
// Формат Terrarium: высота = R*256 + G + B/256 - 32768 (метры).

import type { LatLon } from "./geo";

export const TERRARIUM_URL = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const Z = 14; // ~7 м на пиксель на широте Владивостока
const SIZE = 256;

const cache = new Map<string, Promise<Float32Array | null>>();

function tileXY(p: LatLon, z: number) {
  const n = 2 ** z;
  const x = ((p.lon + 180) / 360) * n;
  const latR = (p.lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n;
  return { x, y };
}

async function decode(blob: Blob): Promise<Float32Array> {
  const bmp = await createImageBitmap(blob);
  const canvas: OffscreenCanvas | HTMLCanvasElement =
    typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(SIZE, SIZE) : Object.assign(document.createElement("canvas"), { width: SIZE, height: SIZE });
  const ctx = canvas.getContext("2d") as OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
  ctx.drawImage(bmp, 0, 0);
  const px = ctx.getImageData(0, 0, SIZE, SIZE).data;
  const out = new Float32Array(SIZE * SIZE);
  for (let i = 0; i < out.length; i++) out[i] = px[i * 4] * 256 + px[i * 4 + 1] + px[i * 4 + 2] / 256 - 32768;
  return out;
}

function tile(x: number, y: number): Promise<Float32Array | null> {
  const key = `${x}/${y}`;
  let t = cache.get(key);
  if (!t) {
    const url = TERRARIUM_URL.replace("{z}", String(Z)).replace("{x}", String(x)).replace("{y}", String(y));
    t = fetch(url)
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
      .then(decode)
      .catch(() => {
        cache.delete(key); // дадим шанс повторить позже
        return null;
      });
    cache.set(key, t);
  }
  return t;
}

/** Высота точки над уровнем моря, м (билинейная интерполяция). null — тайл недоступен. */
export async function elevationAt(p: LatLon): Promise<number | null> {
  const { x, y } = tileXY(p, Z);
  const tx = Math.floor(x), ty = Math.floor(y);
  const data = await tile(tx, ty);
  if (!data) return null;
  // Координаты пикселя внутри тайла; у края берём ближайший пиксель (без соседнего тайла — для наших задач достаточно).
  const fx = Math.min(SIZE - 1.001, Math.max(0, (x - tx) * SIZE - 0.5));
  const fy = Math.min(SIZE - 1.001, Math.max(0, (y - ty) * SIZE - 0.5));
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const ax = fx - x0, ay = fy - y0;
  const at = (i: number, j: number) => data[j * SIZE + i];
  const top = at(x0, y0) * (1 - ax) + at(x0 + 1, y0) * ax;
  const bot = at(x0, y0 + 1) * (1 - ax) + at(x0 + 1, y0 + 1) * ax;
  return top * (1 - ay) + bot * ay;
}
