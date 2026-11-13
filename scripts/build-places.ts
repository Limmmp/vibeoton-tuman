// Собрать data/places.json из кандидатов OSM (data/raw/osm-places.json).
// Записи с verified: true или manual: true, а также ручные записи без osm, не перезаписываются —
// так правки команды переживают повторную сборку.
// Запуск: npm run data:build

import { readFile, writeFile } from "node:fs/promises";
import type { Kind, Place, PriceLevel, Tag } from "../src/data/place.ts";

type OsmEl = { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> };

const UNCHECKED = "Из OSM, человеком не проверено: часы, цена, Wi-Fi/розетки.";

type Rule = { kind: Kind[]; tags: Tag[]; price?: number; priceLevel?: PriceLevel; note?: string };

/** Категория OSM → наш тип места. Порядок важен: первое совпадение побеждает. */
// Объекты, которые в OSM размечены как смотровые и т.п., но местами для людей не являются (найдено аудитом).
const NOT_A_PLACE = /створный знак/i;

function classify(t: Record<string, string>): Rule | null {
  const name = (t["name:ru"] ?? t.name ?? "").toLowerCase();
  if (NOT_A_PLACE.test(name)) return null;
  if (t.amenity === "library")
    return { kind: ["study", "culture"], tags: ["quiet", "indoor"], price: 0, priceLevel: "free", note: "Бесплатный вход — допущение для публичных библиотек, проверить." };
  if (t.amenity === "coworking_space" || t.office === "coworking") return { kind: ["study"], tags: ["wifi", "laptop-ok", "indoor"] };
  if (t.amenity === "cafe" && name.includes("антикафе")) return { kind: ["leisure", "study"], tags: ["indoor", "coffee", "board-games"] };
  if (t.amenity === "cafe") return { kind: ["food", "study"], tags: ["indoor", "coffee"] };
  if (t.amenity === "arts_centre") return { kind: ["creative", "culture"], tags: ["indoor", "art"] };
  if (t.amenity === "community_centre") return { kind: ["creative", "leisure"], tags: ["indoor"] };
  if (t.tourism === "museum") return { kind: ["culture", "history"], tags: ["indoor"] };
  if (t.tourism === "gallery") return { kind: ["culture", "creative"], tags: ["indoor", "art"] };
  if (t.tourism === "viewpoint")
    return { kind: ["outdoor"], tags: ["outdoor", "view"], price: 0, priceLevel: "free", note: "Бесплатно — допущение для смотровых, проверить." };
  if (t.amenity === "cinema") return { kind: ["leisure"], tags: ["indoor", "cinema"] };
  if (t.amenity === "theatre") return { kind: ["culture"], tags: ["indoor", "music"] };
  if (t.leisure === "park")
    return { kind: ["outdoor", "leisure"], tags: ["outdoor"], price: 0, priceLevel: "free", note: "Бесплатно — допущение для городских парков, проверить." };
  if (t.leisure === "escape_game") return { kind: ["leisure"], tags: ["indoor"] };
  if (t.shop === "games") return { kind: ["leisure"], tags: ["indoor", "board-games"] };
  return null;
}

function fromOsm(el: OsmEl): Place | null {
  const t = el.tags ?? {};
  const name = t["name:ru"] ?? t.name;
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;
  if (!name || lat == null || lon == null) return null;
  const rule = classify(t);
  if (!rule) return null;

  const tags = new Set<Tag>(rule.tags);
  if (/^(wlan|yes|wifi)$/.test(t.internet_access ?? "")) tags.add("wifi");
  if (t.wheelchair === "yes") tags.add("wheelchair");

  let price = rule.price ?? null;
  let priceLevel: PriceLevel = rule.priceLevel ?? "unknown";
  if (t.fee === "no") { price = 0; priceLevel = "free"; }
  if (t.fee === "yes" && price === 0) { price = null; priceLevel = "unknown"; }

  const street = t["addr:street"];
  const house = t["addr:housenumber"];
  const website = t.website ?? t["contact:website"];
  const p: Place = {
    id: `osm-${el.type[0]}${el.id}`,
    name,
    lat: +lat.toFixed(6),
    lon: +lon.toFixed(6),
    kind: rule.kind,
    price,
    priceLevel,
    tags: [...tags],
    hours: t.opening_hours ?? null,
    photo: null,
    source: `https://www.openstreetmap.org/${el.type}/${el.id}`,
    osm: `${el.type}/${el.id}`,
    checkedAt: null,
    verified: false,
    notes: [UNCHECKED, rule.note].filter(Boolean).join(" "),
  };
  if (street) p.address = house ? `${street}, ${house}` : street;
  if (website) p.website = website;
  return p;
}

const raw = JSON.parse(await readFile("data/raw/osm-places.json", "utf8")) as { elements: OsmEl[] };
let existing: Place[] = [];
try {
  existing = JSON.parse(await readFile("data/places.json", "utf8"));
} catch {
  /* первая сборка */
}

/** Примерное расстояние в метрах (для близких точек). */
const near = (a: Place, b: Place) => Math.hypot((a.lat - b.lat) * 111320, (a.lon - b.lon) * 111320 * Math.cos((a.lat * Math.PI) / 180));
const richness = (p: Place) => (p.hours ? 2 : 0) + (p.website ? 1 : 0) + (p.address ? 1 : 0) + p.tags.length;

const keep = new Map(existing.filter((p) => p.verified || p.manual || !p.osm).map((p) => [p.id, p]));
const out = new Map<string, Place>(keep);
let fresh = 0, skipped = 0, merged = 0;
for (const el of raw.elements) {
  const p = fromOsm(el);
  if (!p) { skipped++; continue; }
  if (out.has(p.id)) continue; // проверенная или ручная запись важнее
  // Одно место бывает размечено дважды (точкой и контуром): то же название ближе 80 м — оставляем более полную запись.
  const twin = [...out.values()].find((q) => q.name === p.name && near(p, q) < 80);
  if (twin) {
    merged++;
    if (!twin.verified && !twin.manual && richness(p) > richness(twin)) { out.delete(twin.id); out.set(p.id, p); }
    continue;
  }
  out.set(p.id, p);
  fresh++;
}

const order = ["study", "creative", "culture", "history", "leisure", "food", "outdoor"];
const list = [...out.values()].sort((a, b) => order.indexOf(a.kind[0]) - order.indexOf(b.kind[0]) || a.name.localeCompare(b.name, "ru"));
await writeFile("data/places.json", JSON.stringify(list, null, 2) + "\n");

const byKind: Record<string, number> = {};
list.forEach((p) => (byKind[p.kind[0]] = (byKind[p.kind[0]] ?? 0) + 1));
console.log(`data/places.json: ${list.length} мест (из OSM: ${fresh}, склеено дублей: ${merged}, сохранено ручных/проверенных: ${keep.size}, пропущено без названия/категории: ${skipped})`);
console.log("По основному типу:", byKind);
