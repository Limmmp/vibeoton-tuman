// Мост между движком и React Native WebView.
// Внутри RN доступен window.ReactNativeWebView.postMessage; сообщения от RN приходят
// событием "message" (на Android — на document, на iOS — на window).
// Вне RN (обычный браузер) события просто уходят в window.parent — удобно для отладки во фрейме.

import type { Engine } from "./engine";
import type { Command, EngineEvent } from "./protocol";

type RNWindow = Window & { ReactNativeWebView?: { postMessage(s: string): void } };

export const inReactNative = () => !!(window as RNWindow).ReactNativeWebView;

export function send(e: EngineEvent) {
  const rn = (window as RNWindow).ReactNativeWebView;
  if (rn) rn.postMessage(JSON.stringify(e));
  else if (window.parent !== window) window.parent.postMessage(e, "*");
}

export function attachBridge(engine: Engine) {
  engine.on(send);

  const onMessage = async (ev: MessageEvent) => {
    let cmd: Command;
    try {
      cmd = typeof ev.data === "string" ? JSON.parse(ev.data) : ev.data;
    } catch {
      return;
    }
    if (!cmd || typeof cmd !== "object" || typeof (cmd as Command).type !== "string") return;
    try {
      const data = await engine.exec(cmd);
      if (cmd.id) send({ type: "result", id: cmd.id, ok: true, data });
    } catch (err) {
      if (cmd.id) send({ type: "result", id: cmd.id, ok: false, error: (err as Error).message });
    }
  };
  window.addEventListener("message", onMessage);
  document.addEventListener("message", onMessage as unknown as EventListener);

  // Для injectJavaScript из RN и отладки из консоли: window.tuman.exec({...})
  (window as unknown as { tuman: Engine }).tuman = engine;
  send({ type: "ready", state: engine.state() });
}
