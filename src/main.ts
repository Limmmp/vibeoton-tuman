import "maplibre-gl/dist/maplibre-gl.css";
import "./style.css";
import { Engine } from "./engine/engine";
import { attachBridge, inReactNative } from "./engine/bridge";

const engine = await Engine.create("map");
attachBridge(engine);

// Отладочная панель — только в обычном браузере. В приложении интерфейс рисует React Native.
if (!inReactNative()) {
  const { mountDevPanel } = await import("./dev/panel");
  mountDevPanel(engine);
}
