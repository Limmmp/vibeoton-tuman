import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { Engine } from "./engine/engine";
import { attachBridge, inReactNative, send } from "./engine/bridge";
import { LANDMARKS } from "./models/catalog";

try {
  const engine = await Engine.create("map");
  attachBridge(engine);
  const requestedLandmark = LANDMARKS.find(item => item.id === new URLSearchParams(location.search).get("landmark"));
  if (requestedLandmark) { engine.player.follow = false; engine.map.jumpTo({ center: [requestedLandmark.lon, requestedLandmark.lat], zoom: 17 }); }
  if (!inReactNative() || new URLSearchParams(location.search).has("demo")) {
    const { mountDemoControls } = await import("./dev/demo");
    mountDemoControls(engine);
  }

// Отладочная панель — только в обычном браузере. В приложении интерфейс рисует React Native.
  if (!inReactNative() && !new URLSearchParams(location.search).has("embedded")) {
    const { mountDevPanel } = await import("./dev/panel");
    mountDevPanel(engine);
  }
} catch (error) {
  console.error(error);
  const message = "Не удалось запустить карту. Проверь интернет и перезагрузи страницу.";
  send({ type: "mapError", message });
  const notice = document.createElement("div");
  notice.setAttribute("role", "alert");
  notice.textContent = message;
  notice.style.cssText = "position:absolute;inset:24px;z-index:20;color:#eef5f5;font:16px sans-serif";
  document.body.append(notice);
}
