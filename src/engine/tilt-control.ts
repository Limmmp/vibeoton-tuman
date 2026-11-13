import type { Engine } from "./engine";

/** Кнопка внутри карты доступна и в браузере, и в WebView приложения. */
export function mountTiltControl(engine: Engine) {
  const container = document.createElement("div");
  container.className = "maplibregl-ctrl tuman-tilt-control";
  const button = document.createElement("button");
  button.type = "button";
  container.append(button);
  const sync = () => {
    const state = engine.state();
    container.hidden = state.viewMode !== "2d";
    button.textContent = state.tilted2d ? "Вид сверху" : "Наклон 45°";
    button.setAttribute("aria-label", state.tilted2d ? "Вернуть вид сверху" : "Наклонить 2D-карту на 45 градусов");
    button.setAttribute("aria-pressed", String(state.tilted2d));
  };
  button.addEventListener("click", event => {
    event.stopPropagation();
    void engine.exec({ type: "set2dTilt", enabled: !engine.state().tilted2d });
  });
  engine.on(event => { if (event.type === "viewChanged") sync(); });
  engine.map.addControl({ onAdd: () => container, onRemove: () => container.remove() }, "top-right");
  sync();
}
