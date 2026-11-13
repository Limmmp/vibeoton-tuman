// Тесты подбора и разбора часов. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHours, openMinutes } from "./hours.ts";
import { matchGroup, type Member } from "./matchGroup.ts";
import type { Place } from "../data/place.ts";

// Пятница 13 ноября 2026, время Владивостока (UTC+10).
const at = (hhmm: string, day = "2026-11-13") => new Date(`${day}T${hhmm}:00+10:00`);

test("часы: простые правила, через полночь, выходной, неизвестный формат", () => {
  assert.equal(openMinutes("Mo-Fr 10:00-20:00", at("18:00"), at("21:00")), 120);
  assert.equal(openMinutes("Mo-Fr 10:00-20:00; Fr off", at("12:00"), at("13:00")), 0);
  assert.equal(openMinutes("Su-Fr 11:00-19:00", at("11:00"), at("12:00")), 60); // диапазон через воскресенье
  assert.equal(openMinutes("Su-Fr 11:00-19:00", at("11:00", "2026-11-14"), at("12:00", "2026-11-14")), 0); // суббота
  assert.equal(openMinutes("Mo-Su 20:00-02:00", at("23:00"), at("01:00", "2026-11-14")), 120);
  assert.equal(openMinutes("24/7", at("03:00"), at("04:00")), 60);
  assert.equal(openMinutes("Mo-Fr 09:00-13:00,14:00-18:00", at("12:00"), at("15:00")), 120);
  assert.equal(parseHours("Mo-Fr 10:00-20:00; PH off"), null);
  assert.equal(openMinutes(null, at("12:00"), at("13:00")), null);
});

const place = (id: string, extra: Partial<Place>): Place => ({
  id, name: id, lat: 43.1155, lon: 131.8855, kind: ["leisure"], price: null, priceLevel: "unknown",
  tags: [], hours: null, photo: null, source: "https://example.org", checkedAt: null, verified: false, ...extra,
});

const places: Place[] = [
  place("library", { kind: ["study", "culture"], price: 0, priceLevel: "free", tags: ["quiet", "indoor"], hours: "Mo-Su 10:00-20:00" }),
  place("anticafe", { kind: ["leisure"], price: 250, priceLevel: "low", tags: ["indoor", "board-games", "coffee"], hours: "Mo-Su 12:00-23:00" }),
  place("viewpoint", { kind: ["outdoor"], price: 0, priceLevel: "free", tags: ["outdoor", "view", "sea"] }),
  place("museum", { kind: ["culture", "history"], price: 400, priceLevel: "mid", tags: ["indoor"], hours: "Tu-Su 10:00-18:00" }),
  place("cinema", { kind: ["leisure"], price: 450, priceLevel: "mid", tags: ["indoor", "cinema"], hours: "Mo-Su 10:00-02:00" }),
  place("closed-cafe", { kind: ["food"], price: 200, priceLevel: "low", tags: ["indoor", "coffee"], hours: "Mo-Fr 08:00-12:00" }),
];

const win = { start: at("18:00").toISOString(), end: at("22:00").toISOString() };
const friends: Member[] = [
  { name: "Аня", interests: ["boardgames", "coffee"], budget: 300, window: win },
  { name: "Петя", interests: ["sea", "views"], budget: 1500, window: win },
  { name: "Маша", interests: ["cinema", "boardgames"], budget: 800, window: win },
];

test("подбор: всё по карману самому скромному бюджету, закрытое отсеяно, лидер — антикафе", () => {
  const out = matchGroup({ members: friends, places });
  assert.ok(out.window);
  assert.equal(out.results.length, 3);
  for (const r of out.results) assert.ok(r.price != null && r.price <= 300, `${r.place.id}: ${r.price}`);
  const ids = out.results.map((r) => r.place.id);
  assert.ok(!ids.includes("closed-cafe"));
  assert.ok(!ids.includes("museum") && !ids.includes("cinema")); // дороже 300 ₽
  assert.equal(ids[0], "anticafe"); // настолки Ане и Маше, кофе Ане
  assert.match(out.results[0].reason, /Аня — настолки и кофе/);
});

test("подбор: плохая погода — только в помещении", () => {
  const out = matchGroup({ members: friends, places, weather: { bad: true } });
  assert.ok(out.results.every((r) => r.place.tags.includes("indoor")));
  assert.ok(out.hints.length === 0 || out.hints.some((h) => /хорошую погоду/.test(h)));
});

test("подбор: нет общего времени — понятная подсказка", () => {
  const busy = friends.map((m, i) => ({ ...m, window: i === 0 ? { start: at("09:00").toISOString(), end: at("10:00").toISOString() } : win }));
  const out = matchGroup({ members: busy, places });
  assert.equal(out.window, null);
  assert.match(out.hints[0], /нет общего свободного времени/);
});

test("подбор: только бесплатно — подсказка про бюджет", () => {
  const broke = friends.map((m) => ({ ...m, budget: 0, interests: ["cinema"] as Member["interests"] }));
  const out = matchGroup({ members: broke, places });
  assert.ok(out.results.every((r) => r.price === 0));
  assert.ok(out.hints.some((h) => /поднять бюджет до \d+ ₽/.test(h)), out.hints.join(" | "));
});

test("подбор: «без подъёмов» отсеивает место на сопке", () => {
  const flat = friends.map((m, i) => (i === 1 ? { ...m, noClimb: true } : m));
  const out = matchGroup({ members: flat, places, climbOf: (p) => (p.id === "viewpoint" ? 120 : 5) });
  assert.ok(!out.results.some((r) => r.place.id === "viewpoint"));
});

test("подбор: событие должно целиком влезать в окно с учётом дороги", () => {
  const events = [
    { id: "e1", placeId: "anticafe", title: "Турнир по настолкам", start: at("19:00").toISOString(), end: at("21:00").toISOString(), price: 200 },
    { id: "e2", placeId: "anticafe", title: "Слишком рано", start: at("18:05").toISOString(), end: at("19:00").toISOString(), price: 0 },
  ];
  const out = matchGroup({ members: friends, places, events });
  const evIds = out.results.filter((r) => r.event).map((r) => r.event!.id);
  assert.ok(!evIds.includes("e2"));
});
