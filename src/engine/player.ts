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
import avatarConfig from "../../public/avatar/config.json";
import { DEFAULT_SIM_SPEED, demoPoint, movementStep, simSpeed } from "./simulation";

export type PlayerMode = "sim" | "external" | "gps";
type MoveListener = (pos: LatLon, prev: LatLon, jump: boolean) => void;

export const SIM_SPEEDUP = 8;
const GPS_MAX_ACCURACY = 60; // м — хуже игнорируем

export class Player {
  pos: LatLon;
  heading = 0;
  mode: PlayerMode = "sim";
  follow = true;
  simSpeed = DEFAULT_SIM_SPEED;
  private keys = new Set<string>();
  private walkTarget: LatLon | null = null;
  private listeners: MoveListener[] = [];
  private gpsWatch: number | null = null;
  private marker: maplibregl.Marker;
  private markerEl: HTMLElement;
  private renderingActive = true;
  private avatarImage!: HTMLImageElement;
  private idleImage = "";
  private movingImage: string | undefined;
  private movingTimer: ReturnType<typeof setTimeout> | undefined;
  private persist = debounced(() => save("player", this.pos), 1000);

  constructor(private map: MLMap) {
    this.pos = load<LatLon>("player", VLADIVOSTOK);
    this.markerEl = document.createElement("div");
    this.markerEl.className = "tuman-player";
    this.markerEl.style.zIndex = "3";
    this.marker = new maplibregl.Marker({ element: this.markerEl, rotationAlignment: "viewport", pitchAlignment: "viewport", anchor: "bottom", opacity: 1, opacityWhenCovered: 1 })
      .setLngLat([this.pos.lon, this.pos.lat])
      .addTo(map);
    this.setAvatar(DEFAULT_AVATAR);
    this.bindKeys();
    map.on("rotate", () => this.markerEl.style.setProperty("--heading", `${this.heading - map.getBearing()}deg`));
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
    const base = new URL(import.meta.env.BASE_URL + "avatar/", location.href);
    const imageUrl = (path: string) => {
      const url = new URL(path, base);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("Аватар должен быть HTTP/HTTPS-картинкой");
      const version = new URLSearchParams(location.search).get("v"); if (version) url.searchParams.set("v", version);
      return url.href;
    };
    this.idleImage = imageUrl(appearance.imageUrl || avatarConfig.idle);
    const moving = appearance.movingImageUrl || avatarConfig.moving;
    this.movingImage = moving ? imageUrl(moving) : undefined;
    clearTimeout(this.movingTimer);
    if (!this.avatarImage) {
      this.markerEl.innerHTML = `<div class="tuman-avatar"><img class="tuman-avatar__image" alt="Игрок" draggable="false"/><svg class="tuman-avatar__cursor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" fill="#172633" stroke="#fff" stroke-width="2"/><path class="tuman-avatar__heading" d="M12 1 20 19 12 15 4 19Z" stroke="#172633" stroke-width="1.5"/></svg></div>`;
      this.avatarImage = this.markerEl.querySelector<HTMLImageElement>("img")!;
      this.avatarImage.onerror = () => {
        const fallback = new URL("placeholder.svg", base).href;
        if (this.avatarImage.src !== fallback) this.avatarImage.src = fallback;
      };
    }
    this.markerEl.style.setProperty("--accent", escColor(appearance.accentColor));
    this.showAvatarFrame(false);
  }

  private showAvatarFrame(moving: boolean) {
    const src = moving && this.movingImage ? this.movingImage : this.idleImage;
    if (this.avatarImage.src !== src) this.avatarImage.src = src;
  }

  /** Идти к точке (только в симуляции). */
  walkTo(p: LatLon) {
    if (this.mode === "sim") this.walkTarget = demoPoint(p);
  }

  setSimSpeed(multiplier: number) { this.simSpeed = simSpeed(multiplier); return this.simSpeed; }

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
    const step = movementStep(dt, this.simSpeed, this.keys.has("run"));
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
    const point = demoPoint(p);
    this.walkTarget = null;
    this.keys.clear();
    this.setPos(point, this.heading, true);
  }

  /** Фикс от приложения (режим external). */
  externalFix(p: LatLon & { accuracy?: number; heading?: number }) {
    if (this.mode !== "external") return;
    if (p.accuracy != null && p.accuracy > GPS_MAX_ACCURACY) return;
    const h = Number.isFinite(p.heading) ? (p.heading as number) : bearing(this.pos, p);
    this.setPos(p, h, distance(this.pos, p) > 2000);
  }

  private setPos(p: LatLon, heading?: number, jump = false) {
    const prev = this.pos;
    this.pos = { lat: p.lat, lon: p.lon };
    if (heading != null) this.heading = heading;
    if (this.renderingActive) this.syncMarker();
    if (this.movingImage && this.renderingActive) {
      clearTimeout(this.movingTimer);
      this.showAvatarFrame(!jump && distance(prev, this.pos) > 0.01);
      this.movingTimer = setTimeout(() => this.showAvatarFrame(false), 250);
    }
    this.persist();
    this.listeners.forEach((fn) => fn(this.pos, prev, jump));
  }

  setRenderingActive(active: boolean) {
    if (this.renderingActive === active) return;
    this.renderingActive = active;
    if (!active) { clearTimeout(this.movingTimer); this.showAvatarFrame(false); }
    if (active) this.syncMarker();
  }

  private syncMarker() {
    this.marker.setLngLat([this.pos.lon, this.pos.lat]);
    this.markerEl.style.setProperty("--heading", `${this.heading - this.map.getBearing()}deg`);
    if (this.follow) this.map.jumpTo({ center: [this.pos.lon, this.pos.lat] });
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
