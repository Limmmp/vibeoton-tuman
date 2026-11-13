import type { Engine } from "../engine/engine";
import { DEMO_SPEEDS, demoPoint } from "../engine/simulation";
import { LANDMARKS } from "../models/catalog";
import "./demo.css";

export function mountDemoControls(engine: Engine) {
  const root = document.createElement("details"); root.className = "demo-tools";
  if ((window as unknown as { ReactNativeWebView?: unknown }).ReactNativeWebView) root.classList.add("demo-tools-embedded");
  root.innerHTML = `<summary>Демо и коллекция</summary><div class="demo-content"><strong>Быстрое перемещение</strong><p>GPS отключается при запуске демо.</p><button data-mode="teleport">Телепорт по нажатию</button><button data-mode="walk">Идти к точке</button><div class="demo-speeds">${DEMO_SPEEDS.map(value => `<button data-speed="${value}">×${value}</button>`).join("")}</div><label>Широта<input name="lat" inputmode="decimal" aria-label="Широта"></label><label>Долгота<input name="lon" inputmode="decimal" aria-label="Долгота"></label><button data-jump>Телепортироваться</button><div class="demo-targets"></div><a href="./collection.html">Открыть коллекцию</a><p class="demo-status" role="status"></p></div>`;
  document.body.append(root);
  const lat = root.querySelector<HTMLInputElement>('[name="lat"]')!, lon = root.querySelector<HTMLInputElement>('[name="lon"]')!;
  lat.value = engine.player.pos.lat.toFixed(6); lon.value = engine.player.pos.lon.toFixed(6);
  const status = root.querySelector<HTMLElement>(".demo-status")!;
  const enter = async () => { await engine.exec({ type: "setPlayerMode", mode: "sim" }); await engine.exec({ type: "follow", on: true }); };
  for (const item of LANDMARKS) {
    const button = document.createElement("button"); button.textContent = item.name;
    button.onclick = () => { void jump(item); }; root.querySelector(".demo-targets")!.append(button);
  }
  const jump = async (point: { lat: number; lon: number }) => {
    try { const checked = demoPoint(point); await enter(); await engine.exec({ type: "teleport", ...checked }); root.open = false; }
    catch (error) { status.textContent = (error as Error).message; }
  };
  root.addEventListener("click", event => {
    const button = (event.target as HTMLElement).closest("button"); if (!button) return;
    void (async () => {
      try {
        if (button.dataset.mode) { await enter(); await engine.exec({ type: "setDemoTapMode", mode: button.dataset.mode as "walk" | "teleport" }); root.open = false; }
        if (button.dataset.speed) { await enter(); await engine.exec({ type: "setSimSpeed", multiplier: Number(button.dataset.speed) }); status.textContent = `Скорость ×${engine.player.simSpeed}`; }
        if (button.hasAttribute("data-jump")) { if (!lat.value.trim() || !lon.value.trim()) throw new Error("Заполни обе координаты"); await jump({ lat: Number(lat.value.replace(",", ".")), lon: Number(lon.value.replace(",", ".")) }); }
      } catch (error) { status.textContent = (error as Error).message; }
    })();
  });
  engine.on(event => {
    if (event.type === "landmarkTap") location.href = `./collection.html?model=${encodeURIComponent(event.id)}`;
  });
}
