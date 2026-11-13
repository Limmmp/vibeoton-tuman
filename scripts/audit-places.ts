// Автоматический аудит data/places.json: то, что можно проверить без человека.
//  - свежесть данных в OSM (дата последней правки объекта);
//  - отвечает ли сайт места;
//  - подозрительные записи (не место, а объект: створный знак, безымянная «видовая площадка»…).
// verified НЕ ставит — это делает только человек. Результат: data/audit.json и data/audit.md.
// Запуск: npm run data:audit

import { readFile, writeFile } from "node:fs/promises";
import type { Place } from "../src/data/place.ts";

const OVERPASS = "https://overpass-api.de/api/interpreter";
const STALE_YEARS = 4;

type Flag = { level: "drop" | "check"; text: string };
type Row = { id: string; name: string; kind: string; osmEdited?: string; site?: string; flags: Flag[] };

const places = JSON.parse(await readFile("data/places.json", "utf8")) as Place[];

// --- 1. Даты правок в OSM ---
const ids = { n: [] as string[], w: [] as string[], r: [] as string[] };
for (const p of places) {
  const m = p.osm?.match(/^(node|way|relation)\/(\d+)$/);
  if (m) ids[m[1][0] as "n" | "w" | "r"].push(m[2]);
}
const q = `[out:json][timeout:90];(${ids.n.length ? `node(id:${ids.n.join(",")});` : ""}${ids.w.length ? `way(id:${ids.w.join(",")});` : ""}${ids.r.length ? `relation(id:${ids.r.join(",")});` : ""});out meta;`;
const meta = new Map<string, { timestamp: string; tags?: Record<string, string> }>();
{
  const r = await fetch(OVERPASS, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "tuman-vladivostok-hackathon/0.1" }, body: "data=" + encodeURIComponent(q) });
  if (!r.ok) throw new Error(`Overpass ${r.status}`);
  for (const e of ((await r.json()) as { elements: { type: string; id: number; timestamp: string; tags?: Record<string, string> }[] }).elements)
    meta.set(`${e.type}/${e.id}`, { timestamp: e.timestamp, tags: e.tags });
}

// --- 2. Сайты ---
async function checkSite(url: string): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(url.startsWith("http") ? url : `https://${url}`, { method: "GET", redirect: "follow", signal: ctrl.signal, headers: { "User-Agent": "Mozilla/5.0 (tuman-vladivostok audit)" } });
    return r.ok ? "ok" : `HTTP ${r.status}`;
  } catch (e) {
    return (e as Error).name === "AbortError" ? "таймаут" : "не открывается";
  } finally {
    clearTimeout(t);
  }
}
const sites = new Map<string, string>();
const withSite = places.filter((p) => p.website);
for (let i = 0; i < withSite.length; i += 8) {
  await Promise.all(withSite.slice(i, i + 8).map(async (p) => sites.set(p.id, await checkSite(p.website!))));
}

// --- 3. Эвристики ---
const NOT_A_PLACE = /створный знак|маяк-створ|опора|вышка сотов|антенна/i;
const GENERIC = /^(видовая площадка|смотровая площадка|вид на .+|сквер|парк)$/i;
const now = Date.now();

const rows: Row[] = places.map((p) => {
  const flags: Flag[] = [];
  const m = p.osm ? meta.get(p.osm) : undefined;
  if (p.osm && !m) flags.push({ level: "drop", text: "объекта больше нет в OSM (удалён или перемещён)" });
  if (m) {
    const t = m.tags ?? {};
    if (Object.keys(t).some((k) => /^(disused|abandoned|was|demolished|removed):/.test(k)) || t.opening_hours === "closed")
      flags.push({ level: "drop", text: "в OSM помечено как закрытое/заброшенное" });
    const age = (now - Date.parse(m.timestamp)) / (365.25 * 864e5);
    if (age > STALE_YEARS) flags.push({ level: "check", text: `в OSM не правилось ${Math.floor(age)} лет — может не существовать` });
  }
  if (NOT_A_PLACE.test(p.name)) flags.push({ level: "drop", text: "не место для людей (навигационный/технический объект)" });
  if (GENERIC.test(p.name.trim())) flags.push({ level: "check", text: "безликое название — дать нормальное или убрать" });
  if (/детск/i.test(p.name) && p.kind.includes("study")) flags.push({ level: "check", text: "детская библиотека — подходит ли студентам?" });
  const site = sites.get(p.id);
  if (site && site !== "ok") flags.push({ level: "check", text: `сайт: ${site}` });
  if (p.kind.includes("study") && !p.hours) flags.push({ level: "check", text: "нет часов работы — критично для «Мест»" });
  return { id: p.id, name: p.name, kind: p.kind[0], osmEdited: m?.timestamp.slice(0, 10), site, flags };
});

await writeFile("data/audit.json", JSON.stringify({ auditedAt: new Date().toISOString().slice(0, 10), rows }, null, 1) + "\n");

// --- Отчёт для людей ---
const drop = rows.filter((r) => r.flags.some((f) => f.level === "drop"));
const check = rows.filter((r) => !drop.includes(r) && r.flags.length);
const clean = rows.filter((r) => !r.flags.length);
const line = (r: Row) => `| ${r.name} | ${r.kind} | ${r.osmEdited ?? "—"} | ${r.flags.map((f) => f.text).join("; ")} | [OSM](https://www.openstreetmap.org/${places.find((p) => p.id === r.id)?.osm}) |`;
const md = [
  `# Аудит каталога мест`,
  ``,
  `Автоматическая проверка от ${new Date().toISOString().slice(0, 10)}: ${rows.length} мест. Убрать: ${drop.length}, проверить руками: ${check.length}, без замечаний: ${clean.length}.`,
  `Это не замена проверке человеком: «без замечаний» значит только, что робот не нашёл проблем. \`verified\` ставит человек.`,
  ``,
  `## Убрать из каталога (${drop.length})`,
  ``,
  `| Место | Тип | Правка в OSM | Почему | Ссылка |`,
  `| --- | --- | --- | --- | --- |`,
  ...drop.map(line),
  ``,
  `## Проверить руками (${check.length})`,
  ``,
  `| Место | Тип | Правка в OSM | Что проверить | Ссылка |`,
  `| --- | --- | --- | --- | --- |`,
  ...check.sort((a, b) => a.kind.localeCompare(b.kind)).map(line),
  ``,
].join("\n");
await writeFile("data/audit.md", md);
console.log(`Аудит: ${rows.length} мест · убрать ${drop.length} · проверить ${check.length} · без замечаний ${clean.length} · сайтов проверено ${sites.size}`);

// Висящие keep-alive соединения после fetch не дают процессу завершиться.
process.exit(0);
