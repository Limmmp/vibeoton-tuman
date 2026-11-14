// Отладочная панель движка для браузера. Не интерфейс приложения — его делает Дима на React Native.
// Здесь только кнопки, чтобы проверить рельеф, туман, игрока и маршруты.

import type { Engine } from "../engine/engine";
import { formatDistance } from "../engine/geo";
import type { Place } from "../data/place";
import type { MapLayer } from "../engine/layers";
import placesJson from "../../data/places.json";
import { LANDMARK_QUEST } from "../quests/catalog";
import type { ActiveStep } from "../quests/types";
import "./panel.css";

const places = placesJson as Place[];

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
    <div class="dev-row">
      <button data-act="places">Места</button>
    </div>
    <div class="dev-row dev-layers">
      <button data-layer="quests" class="on">Задания</button>
      <button data-layer="study" class="on">Учёба</button>
      <button data-layer="leisure" class="on">Досуг</button>
      <button data-layer="history" class="on">История</button>
      <button data-layer="events" class="on">События</button>
    </div>
    <div class="dev-row">
      <button data-act="quest">Тест-квест</button>
      <button data-act="quest-stop">Стоп</button>
    </div>
    <div class="dev-quest" hidden></div>
    <div class="dev-place" hidden></div>
    <div class="dev-stats">
      <div>Открыто: <b data-out="area">—</b></div>
      <div>Высота под курсором: <b data-out="h">—</b></div>
      <div>Режим: <b data-out="mode">симуляция</b></div>
      <div>Прогресс: <b data-out="progress">—</b></div>
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
  const updateProgress = () => {
    const p = engine.state().progress;
    out("progress", `${p.level} ур. · ${p.xp} XP · ${p.cash} монет · ${Object.keys(p.inventory).length} предметов`);
  };
  updateArea();
  updateProgress();
  const placeBox = $(".dev-place");
  const questBox = $(".dev-quest");
  const renderQuest = (active: ActiveStep | null) => {
    if (!active) {
      questBox.hidden = true;
      questBox.replaceChildren();
      return;
    }
    questBox.hidden = false;
    const units = { seconds: "с", items: "точек", cells: "ячеек", meters: "м" } as const;
    const progress = active.progress ? ` · ${active.progress.current}/${active.progress.total} ${units[active.progress.unit]}` : "";
    questBox.innerHTML = `<b>${active.questTitle}</b><br>Шаг ${active.stepIndex + 1}/${active.stepCount}: ${active.step.text || active.step.type}${active.distanceMeters != null ? ` · ${active.distanceMeters} м` : ""}${progress}`;
    const actions = document.createElement("div");
    actions.className = "dev-row dev-quest-actions";
    if (active.step.type === "listen" && active.runtime.audioReady) actions.append(actionButton("Аудио готово", "quest-listen"));
    if (active.step.type === "look" && active.runtime.confirmationReady) actions.append(actionButton("Подтвердить", "quest-look"));
    if (active.step.type === "quiz") active.step.answers.forEach((answer, i) => actions.append(actionButton(answer, `quest-answer-${i}`)));
    if (actions.childElementCount) questBox.append(actions);
  };
  renderQuest(engine.state().quest);
  engine.on((e) => {
    if (e.type === "fogChanged") updateArea();
    if (e.type === "progressChanged" || e.type === "inventoryChanged") updateProgress();
    if (e.type === "mapLongPress") buildRoute(e.lat, e.lon);
    if (e.type === "activeStep") renderQuest(e.active);
    if (e.type === "questDone" || e.type === "questFailed" || e.type === "questStopped") renderQuest(null);
    if (e.type === "questTargetTap") {
      const target = engine.state().quest?.targets.find((item) => item.id === e.id);
      if (target) void engine.exec({ type: "walkTo", lat: target.lat, lon: target.lon });
    }
    if (e.type === "placeTap") {
      const p = places.find((x) => x.id === e.id);
      if (!p) return;
      const price = p.priceLevel === "free" ? "бесплатно" : p.price != null ? `${p.price} ₽` : "цена неизвестна";
      placeBox.textContent = [p.name, `${p.kind.join(", ")} · ${price}`, p.hours ?? "часы неизвестны", p.tags.join(", "), p.verified ? "✓ проверено" : "не проверено"].join("\n");
      placeBox.hidden = false;
    }
  });

  root.addEventListener("click", async (ev) => {
    const btn = (ev.target as HTMLElement).closest("button");
    if (!btn) return;
    try {
      // Переключатели слоёв меток → setLayers (как сделает меню «Слои» в приложении).
      if (btn.dataset.layer) {
        btn.classList.toggle("on");
        const layers = [...root.querySelectorAll<HTMLButtonElement>(".dev-layers button.on")].map((b) => b.dataset.layer!);
        await engine.exec({ type: "setLayers", layers: layers as MapLayer[] });
        return;
      }
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
        case "quest":
          await engine.exec({ type: "teleport", ...LANDMARK_QUEST.start });
          await engine.exec({ type: "startQuestById", questId: LANDMARK_QUEST.id });
          break;
        case "quest-stop":
          await engine.exec({ type: "stopQuest" });
          break;
        case "quest-listen":
          await engine.exec({ type: "completeListen" });
          break;
        case "quest-look":
          await engine.exec({ type: "confirmLook" });
          break;
        case "quest-answer-0":
        case "quest-answer-1":
        case "quest-answer-2":
          await engine.exec({ type: "answerQuiz", answer: Number(btn.dataset.act.at(-1)) });
          break;
        case "places": {
          const shown = btn.dataset.on === "1";
          await engine.exec({ type: "showPlaces", places: shown ? [] : places.map((p) => ({ id: p.id, lat: p.lat, lon: p.lon, name: p.name, kind: p.kind[0] })) });
          btn.dataset.on = shown ? "0" : "1";
          btn.textContent = shown ? "Места" : `Скрыть места (${places.length})`;
          break;
        }
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

function actionButton(text: string, action: string) {
  const button = document.createElement("button");
  button.textContent = text;
  button.dataset.act = action;
  return button;
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
