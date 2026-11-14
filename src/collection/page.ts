import { LANDMARKS, type Landmark } from "../models/catalog";

const params = new URLSearchParams(location.search);
if (params.has("embedded")) document.body.classList.add("embedded");
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const cards = $("#cards"), status = $("#status"), name = $("#model-name"), note = $("#model-note");
let viewer: ReturnType<typeof import("./viewer").createViewer> | undefined;
let generation = 0;
const loader = import("./viewer");
function mapLink(item?: Landmark) {
  const url = new URL("./", location.href);
  if (params.has("v")) url.searchParams.set("v", params.get("v")!);
  if (item) url.searchParams.set("landmark", item.id);
  return url.href;
}
$("#back").setAttribute("href", mapLink());
for (const [index, item] of LANDMARKS.entries()) {
  const button = document.createElement("button"); button.dataset.id = item.id;
  const number = document.createElement("span"); number.className = "number"; number.textContent = `0${index + 1}`;
  const title = document.createElement("span"); title.className = "card-name"; title.textContent = item.name;
  const caption = document.createElement("span"); caption.className = "card-caption"; caption.textContent = "Открыть 3D-превью";
  button.append(number, title, caption); button.onclick = () => {
    void select(item);
    $("#preview").scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }; cards.append(button);
}
async function select(item: Landmark) {
  const token = ++generation;
  name.textContent = item.name; status.textContent = "Загрузка…"; note.textContent = "";
  for (const button of cards.querySelectorAll("button")) button.setAttribute("aria-pressed", String(button.dataset.id === item.id));
  $("#on-map").setAttribute("href", mapLink(item));
  try {
    const module = await loader; if (token !== generation) return;
    viewer ??= module.createViewer($("#canvas"));
    const loaded = await viewer.show(item); if (!loaded || token !== generation) return;
    status.textContent = loaded.placeholder ? "Заглушка" : "GLB-модель";
    note.textContent = loaded.placeholder ? `${loaded.message}. Пока показана условная фигурка, не точная копия достопримечательности.` : "Поворачивай фигурку и рассмотри детали.";
  } catch {
    status.textContent = "3D недоступно"; note.textContent = "Не удалось запустить просмотр. Проверь поддержку WebGL и перезагрузи страницу.";
  }
}
$("#reset").onclick = () => viewer?.reset();
$("#on-map").onclick = event => {
  const native = (window as unknown as { ReactNativeWebView?: { postMessage(raw: string): void } }).ReactNativeWebView;
  if (!native) return;
  event.preventDefault();
  const id = cards.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.dataset.id;
  native.postMessage(JSON.stringify({ type: "collectionLocate", id }));
};
window.addEventListener("pagehide", () => { generation++; viewer?.dispose(); viewer = undefined; });
window.addEventListener("pageshow", event => {
  if (!event.persisted) return;
  const id = cards.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.dataset.id;
  void select(LANDMARKS.find(item => item.id === id) ?? LANDMARKS[0]);
});
void select(LANDMARKS.find(item => item.id === params.get("model")) ?? LANDMARKS[0]);
