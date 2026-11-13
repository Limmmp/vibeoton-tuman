// Метки мест на карте в стиле иконок приложения (mobile/src/glyphs.tsx): тёмный круг,
// цветное кольцо категории, линейная иконка, «хвостик» к точке. Рисуются на канвасе из SVG-контуров.
import type { Map as MLMap } from "maplibre-gl";

const KINDS: Record<string, { color: string; paths: string[] }> = {
  study: { color: "#4CC2B5", paths: ["M4 6.5C6.5 5 9.5 5 12 6.5v12c-2.5-1.5-5.5-1.5-8 0Z", "M20 6.5C17.5 5 14.5 5 12 6.5v12c2.5-1.5 5.5-1.5 8 0Z"] },
  creative: { color: "#4CC2B5", paths: ["M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.8 2-1.8 0-1.4-1.6-1.6-1.6-3 0-1 .8-1.7 1.9-1.7H17a3.5 3.5 0 0 0 3.5-3.5c0-3.9-3.8-7-8.5-7Z", "M7.5 11.5h.01", "M10 7.5h.01", "M14.5 7.5h.01"] },
  leisure: { color: "#FF7A6B", paths: ["M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z", "M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16", "M8.5 3.5v2.5", "M12 3.5v2.5"] },
  food: { color: "#FF7A6B", paths: ["M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5Z", "M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16"] },
  event: { color: "#FF7A6B", paths: ["m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8Z"] },
  culture: { color: "#E0A36A", paths: ["M3.5 9 12 4l8.5 5Z", "M5.5 9v8", "M10 9v8", "M14 9v8", "M18.5 9v8", "M3.5 20h17"] },
  history: { color: "#E0A36A", paths: ["M9.2 21 10.4 9h3.2l1.2 12Z", "M9.6 9V5.5h4.8V9", "M9 5.5 12 3l3 2.5", "M6 21h12"] },
  outdoor: { color: "#5BC07A", paths: ["M2 19.5 8.5 9l4 6 3-4.2 6.5 8.7Z"] },
  quest: { color: "#F5B83D", paths: ["M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z", "M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6Z"] },
  collect: { color: "#F5B83D", paths: ["m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8Z"] },
};

export const PIN_KINDS = Object.keys(KINDS);
export const pinColor = (kind: string | undefined) => KINDS[kind ?? ""]?.color ?? "#F5B83D";

function drawPin(color: string, paths: string[], ratio: number): ImageData {
  const w = 40 * ratio, h = 48 * ratio;
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d")!;
  g.scale(ratio, ratio);
  // тень
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath(); g.ellipse(20, 45, 6, 2, 0, 0, Math.PI * 2); g.fill();
  // хвостик и круг
  g.fillStyle = "#131C25";
  g.beginPath(); g.moveTo(14, 32); g.lineTo(20, 44); g.lineTo(26, 32); g.closePath(); g.fill();
  g.beginPath(); g.arc(20, 19, 16, 0, Math.PI * 2); g.fill();
  g.strokeStyle = color; g.lineWidth = 2.5;
  g.beginPath(); g.arc(20, 19, 14.5, 0, Math.PI * 2); g.stroke();
  // иконка 24×24 → 18×18 в центре
  g.save();
  g.translate(11, 10); g.scale(0.75, 0.75);
  g.strokeStyle = color; g.lineWidth = 2.1; g.lineCap = "round"; g.lineJoin = "round";
  for (const d of paths) g.stroke(new Path2D(d));
  g.restore();
  return g.getImageData(0, 0, w, h);
}

/** Регистрирует картинки pin-<kind> в стиле карты. Вызывать после загрузки стиля. */
export function addPinImages(map: MLMap) {
  const ratio = Math.min(3, Math.max(2, Math.round(window.devicePixelRatio || 2)));
  for (const [kind, { color, paths }] of Object.entries(KINDS)) {
    const id = `pin-${kind}`;
    if (!map.hasImage(id)) map.addImage(id, drawPin(color, paths, ratio), { pixelRatio: ratio });
  }
  if (!map.hasImage("pin-default")) map.addImage("pin-default", drawPin("#F5B83D", KINDS.quest.paths, ratio), { pixelRatio: ratio });
}
