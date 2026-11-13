// Игрок: позиция и источники движения.
//  - "sim"      — симуляция: WASD/стрелки или клик по карте, время ускорено (для демо в зале);
//  - "external" — позицию присылает приложение (React Native берёт GPS через expo-location, в т.ч. в фоне);
//  - "gps"      — GPS самого браузера (для проверки движка с телефона без приложения).

import maplibregl, { type Map as MLMap } from "maplibre-gl";
import { move, bearing, distance, type LatLon } from "./geo";
import { load, save, debounced } from "./storage";
import { VLADIVOSTOK } from "./basemap";
import type { AvatarAppearance } from "../progress/types";
import { DEFAULT_AVATAR } from "../progress/avatar";

export type PlayerMode = "sim" | "external" | "gps";
type MoveListener = (pos: LatLon, prev: LatLon, jump: boolean) => void;

const WALK = 1.5; // м/с
const RUN_MULT = 4; // Shift
export const SIM_SPEEDUP = 8;
const GPS_MAX_ACCURACY = 60; // м — хуже игнорируем

export class Player {
  pos: LatLon;
  heading = 0;
  mode: PlayerMode = "sim";
  follow = true;
  private keys = new Set<string>();
  private walkTarget: LatLon | null = null;
  private listeners: MoveListener[] = [];
  private gpsWatch: number | null = null;
  private marker: maplibregl.Marker;
  private markerEl: HTMLElement;
  private persist = debounced(() => save("player", this.pos), 1000);

  constructor(private map: MLMap) {
    this.pos = load<LatLon>("player", VLADIVOSTOK);
    this.markerEl = document.createElement("div");
    this.markerEl.className = "tuman-player";
    this.marker = new maplibregl.Marker({ element: this.markerEl, rotationAlignment: "viewport", pitchAlignment: "viewport", anchor: "bottom" })
      .setLngLat([this.pos.lon, this.pos.lat])
      .addTo(map);
    this.setAvatar(DEFAULT_AVATAR);
    this.bindKeys();
    // Пользователь сам потащил карту — перестаём следовать за игроком.
    map.on("dragstart", () => (this.follow = false));
  }

  get timeScale() {
    return this.mode === "sim" ? SIM_SPEEDUP : 1;
  }

  onMove(fn: MoveListener) {
    this.listeners.push(fn);
  }

  setAvatar(appearance: AvatarAppearance) {
    const hat = appearance.equipped.head === "admiral-cap" ? `<path d="M9 9h18l-2 5H11z" fill="#F5B83D"/><path d="M13 6h10l2 3H11z" fill="#F4F6F8" stroke="#0F1720" stroke-width="1.5"/>` : "";
    this.markerEl.dataset.modelUrl = appearance.modelUrl ?? "";
    this.markerEl.innerHTML = `<div class="tuman-avatar" aria-label="Игрок">
      <svg class="tuman-avatar__body" viewBox="0 0 36 50" aria-hidden="true">
        <ellipse cx="18" cy="46" rx="12" ry="3" fill="rgba(15,23,32,.35)"/>
        <circle cx="18" cy="14" r="8" fill="#F0C7A5" stroke="#0F1720" stroke-width="2"/>
        <path d="M8 46v-18c0-7 4-10 10-10s10 3 10 10v18z" fill="${escColor(appearance.bodyColor)}" stroke="#0F1720" stroke-width="2"/>
        <path d="M13 45V31M23 45V31" stroke="#0F1720" stroke-width="3" stroke-linecap="round"/>
        <circle cx="15" cy="13" r="1" fill="#0F1720"/><circle cx="21" cy="13" r="1" fill="#0F1720"/>
        ${hat}
      </svg>
      <svg class="tuman-avatar__heading" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M10 1 16 15 10 12 4 15z" fill="${escColor(appearance.accentColor)}" stroke="#0F1720" stroke-width="1.5"/>
      </svg>
    </div>`;
  }

  /** Идти к точке (только в симуляции). */
  walkTo(p: LatLon) {
    if (this.mode === "sim") this.walkTarget = p;
  }

  private bindKeys() {
    const codes: Record<string, string> = {
      KeyW: "up", ArrowUp: "up", KeyS: "down", ArrowDown: "down",
      KeyA: "left", ArrowLeft: "left", KeyD: "right", ArrowRight: "right",
      ShiftLeft: "run", ShiftRight: "run",
    };
    addEventListener("keydown", (e) => {
      if ((e.target as HTMLElement)?.closest?.("input, select, textarea")) return;
      const k = codes[e.code];
      if (!k) return;
      this.keys.add(k);
      if (k !== "run") { this.walkTarget = null; this.follow = true; }
      if (e.code.startsWith("Arrow")) e.preventDefault();
    });
    addEventListener("keyup", (e) => this.keys.delete(codes[e.code]));
    addEventListener("blur", () => this.keys.clear());
  }

  /** Игровой цикл. dt — секунды. */
  tick(dt: number) {
    if (this.mode !== "sim") return;
    const step = WALK * (this.keys.has("run") ? RUN_MULT : 1) * dt * SIM_SPEEDUP;
    let dx = 0, dy = 0;
    if (this.keys.has("up")) dy += 1;
    if (this.keys.has("down")) dy -= 1;
    if (this.keys.has("right")) dx += 1;
    if (this.keys.has("left")) dx -= 1;
    if (dx || dy) {
      // Клавиши — относительно поворота карты, чтобы «вверх» всегда было «вперёд по экрану».
      const deg = (Math.atan2(dx, dy) * 180) / Math.PI + this.map.getBearing();
      this.setPos(move(this.pos, deg, step), deg);
    } else if (this.walkTarget) {
      const d = distance(this.pos, this.walkTarget);
      if (d <= step) {
        this.setPos(this.walkTarget, this.heading);
        this.walkTarget = null;
      } else {
        const deg = bearing(this.pos, this.walkTarget);
        this.setPos(move(this.pos, deg, step), deg);
      }
    }
  }

  teleport(p: LatLon) {
    this.setPos(p, this.heading, true);
  }

  /** Фикс от приложения (режим external). */
  externalFix(p: LatLon & { accuracy?: number; heading?: number }) {
    if (this.mode !== "external") this.setMode("external");
    if (p.accuracy != null && p.accuracy > GPS_MAX_ACCURACY) return;
    const h = Number.isFinite(p.heading) ? (p.heading as number) : bearing(this.pos, p);
    this.setPos(p, h, distance(this.pos, p) > 2000);
  }

  private setPos(p: LatLon, heading?: number, jump = false) {
    const prev = this.pos;
    this.pos = { lat: p.lat, lon: p.lon };
    if (heading != null) this.heading = heading;
    this.marker.setLngLat([p.lon, p.lat]);
    this.markerEl.style.setProperty("--heading", `${this.heading}deg`);
    if (this.follow) this.map.jumpTo({ center: [p.lon, p.lat] });
    this.persist();
    this.listeners.forEach((fn) => fn(this.pos, prev, jump));
  }

  async setMode(mode: PlayerMode): Promise<PlayerMode> {
    if (this.gpsWatch != null) navigator.geolocation.clearWatch(this.gpsWatch);
    this.gpsWatch = null;
    this.walkTarget = null;
    if (mode === "gps") {
      if (!("geolocation" in navigator)) throw new Error("Браузер не поддерживает геолокацию");
      if (!window.isSecureContext) throw new Error("GPS работает только по https или на localhost");
      await new Promise<void>((resolve, reject) => {
        let first = true;
        this.gpsWatch = navigator.geolocation.watchPosition(
          (g) => {
            const { latitude: lat, longitude: lon, accuracy, heading } = g.coords;
            if (accuracy > GPS_MAX_ACCURACY && !first) return;
            this.setPos({ lat, lon }, Number.isFinite(heading) ? (heading as number) : bearing(this.pos, { lat, lon }), first);
            if (first) { first = false; resolve(); }
          },
          (err) => first && reject(new Error(err.code === 1 ? "Доступ к геолокации запрещён" : "Не удалось получить позицию")),
          { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
        );
      });
    }
    this.mode = mode;
    return mode;
  }
}

function escColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#3FB8AF";
}
