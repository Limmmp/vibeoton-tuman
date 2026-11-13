// Прогон matchGroup на настоящем каталоге: сценарий из демо (Аня, Петя, Маша, пятница вечер).
// Запуск: node scripts/demo-match.ts [--bad-weather]
import { readFile } from "node:fs/promises";
import { matchGroup, type Member } from "../src/match/matchGroup.ts";
import type { Place } from "../src/data/place.ts";

const places = JSON.parse(await readFile("data/places.json", "utf8")) as Place[];
const win = { start: "2026-11-13T18:00:00+10:00", end: "2026-11-13T22:00:00+10:00" };
const members: Member[] = [
  { name: "Аня", interests: ["boardgames", "coffee"], budget: 300, window: win, from: { lat: 43.0245, lon: 131.8925 } }, // кампус ДВФУ
  { name: "Петя", interests: ["sea", "views"], budget: 1500, window: win, from: { lat: 43.1155, lon: 131.8855 } }, // центр
  { name: "Маша", interests: ["cinema", "boardgames"], budget: 800, window: win, from: { lat: 43.1565, lon: 131.9213 } }, // Вторая Речка
];
const out = matchGroup({ members, places, weather: { bad: process.argv.includes("--bad-weather") } });
console.log("Окно:", out.window);
for (const r of out.results)
  console.log(`\n${r.score.toFixed(2)}  ${r.place.name} [${r.place.kind.join(",")}] · ${r.price == null ? "цена ?" : r.price + " ₽"}\n  ${r.reason}\n  флаги: ${r.flags.join("; ") || "—"} · дорога: ${r.travel.map((t) => `${t.name} ${t.minutes} мин`).join(", ")}`);
if (out.hints.length) console.log("\nПодсказки:", out.hints);
