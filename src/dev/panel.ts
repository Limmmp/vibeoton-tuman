// Отладочная панель движка для браузера. Не интерфейс приложения — его делает Дима на React Native.
// Здесь только кнопки, чтобы проверить рельеф, туман, игрока и маршруты.

import type { Engine } from "../engine/engine";
import { formatDistance } from "../engine/geo";
import "./panel.css";

export function mountDevPanel(engine: Engine) {
  const root = document.createElement("div");
  root.className = "dev-panel";
  root.innerHTML = `
    <div class="dev-title">Туман · прототип карты</div>
    <div class="dev-row">
      <button data-act="view">3D</button>
      <button data-act="mode">GPS</button>
      <button data-act="follow">За игроком</button>
    </div>
    <div class="dev-row">
      <button data-act="reveal">Открыть 500 м</button>
      <button data-act="reset">Сбросить туман</button>
    </div>
    <div class="dev-stats">
      <div>Открыто: <b data-out="area">—</b></div>
      <div>Высота под курсором: <b data-out="h">—</b></div>
      <div>Режим: <b data-out="mode">симуляция</b></div>
    </div>
    <div class="dev-hint">WASD / стрелки — идти (Shift — бегом), клик — идти к точке, правый клик или долгое нажатие — маршрут с высотами.</div>
    <div class="dev-route" hidden>
      <div data-out="route"></div>
      <canvas width="260" height="70"></canvas>
    </div>
    <div class="dev-error" hidden></div>`;
  document.body.appendChild(root);

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector(sel) as T;
  const out = (name: string, text: string) => ($(`[data-out="${name}"]`).textContent = text);
  const err = $(".dev-error");
  const showError = (e: unknown) => {
    err.textContent = (e as Error).message ?? String(e);
    err.hidden = false;
    setTimeout(() => (err.hidden = true), 5000);
  };

  const updateArea = () => {
    const s = engine.state();
    out("area", `${s.fog.km2.toFixed(3)} км² (${s.fog.cells} ячеек)`);
  };
  updateArea();
  engine.on((e) => {
    if (e.type === "fogChanged") updateArea();
    if (e.type === "mapLongPress") buildRoute(e.lat, e.lon);
  });

  root.addEventListener("click", async (ev) => {
    const btn = (ev.target as HTMLElement).closest("button");
    if (!btn) return;
    try {
      switch (btn.dataset.act) {
        case "view": {
          const next = engine.viewMode === "2d" ? "3d" : "2d";
          await engine.exec({ type: "setViewMode", mode: next });
          btn.textContent = next === "2d" ? "3D" : "2D";
          break;
        }
        case "mode": {
          const next = engine.player.mode === "gps" ? "sim" : "gps";
          await engine.exec({ type: "setPlayerMode", mode: next });
          btn.textContent = next === "gps" ? "Симуляция" : "GPS";
          out("mode", next === "gps" ? "GPS" : "симуляция");
          break;
        }
        case "follow":
          await engine.exec({ type: "follow", on: true });
          break;
        case "reveal":
          await engine.exec({ type: "revealAt", ...engine.player.pos, radius: 500 });
          break;
        case "reset":
          await engine.exec({ type: "resetFog" });
          break;
      }
    } catch (e) {
      showError(e);
    }
  });

  // Высота под курсором — проверка, насколько точны тайлы рельефа.
  let pending = false;
  engine.map.on("mousemove", async (e) => {
    if (pending) return;
    pending = true;
    try {
      const { h } = (await engine.exec({ type: "elevation", lat: e.lngLat.lat, lon: e.lngLat.lng })) as { h: number | null };
      out("h", h == null ? "нет данных" : `${Math.round(h)} м`);
    } finally {
      setTimeout(() => (pending = false), 80);
    }
  });

  async function buildRoute(lat: number, lon: number) {
    const box = $(".dev-route");
    box.hidden = false;
    out("route", "Строю маршрут…");
    try {
      const r = (await engine.exec({ type: "route", to: { lat, lon } })) as {
        distance: number; climb: number; descent: number; minutes: number; profile: { d: number; h: number }[];
      };
      out("route", `${formatDistance(r.distance)} · ↑ ${r.climb} м · ↓ ${r.descent} м · ≈ ${r.minutes} мин`);
      drawProfile(box.querySelector("canvas")!, r.profile);
    } catch (e) {
      out("route", "Не получилось построить маршрут");
      showError(e);
    }
  }
}

function drawProfile(cv: HTMLCanvasElement, profile: { d: number; h: number }[]) {
  const g = cv.getContext("2d")!;
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  if (profile.length < 2) return;
  const hs = profile.map((p) => p.h);
  const min = Math.min(...hs), max = Math.max(...hs, min + 10);
  const maxD = profile[profile.length - 1].d || 1;
  const x = (d: number) => (d / maxD) * (W - 2) + 1;
  const y = (h: number) => H - 14 - ((h - min) / (max - min)) * (H - 22);
  g.beginPath();
  g.moveTo(x(0), H - 14);
  profile.forEach((p) => g.lineTo(x(p.d), y(p.h)));
  g.lineTo(x(maxD), H - 14);
  g.closePath();
  g.fillStyle = "rgba(245,184,61,0.25)";
  g.fill();
  g.beginPath();
  profile.forEach((p, i) => (i ? g.lineTo(x(p.d), y(p.h)) : g.moveTo(x(p.d), y(p.h))));
  g.strokeStyle = "#F5B83D";
  g.lineWidth = 1.5;
  g.stroke();
  g.fillStyle = "#9aa6b2";
  g.font = "10px system-ui, sans-serif";
  g.fillText(`${Math.round(min)}–${Math.round(max)} м`, 2, H - 2);
}
