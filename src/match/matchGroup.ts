// Подбор досуга для компании («Компания» в диз-доке, раздел 5).
// Чистая функция без сети и без карты: работает и в приложении (React Native), и на сервере.
//
//  1. Жёсткие фильтры: по карману всем (цена ≤ минимального бюджета), открыто в общее окно
//     с учётом дороги, погода (в туман/дождь — только в помещении), «без крутых подъёмов».
//  2. Оценка: для каждого участника — совпадение места с его интересами (0…1);
//     итог = минимум × 0,6 + среднее × 0,4 (никому не должно быть совсем скучно) + мелкие бонусы.
//  3. Разнообразие: топ-3 из разных типов мест, по возможности один бесплатный.
//  4. Причины «почему вам» — шаблоном; позже их может переписать ИИ, но выбирает места только этот код.
//  5. Ничего не нашлось — подсказки, какое условие мешает.

import type { Kind, Place, Tag } from "../data/place.ts";
import { distance, type LatLon } from "../engine/geo.ts";
import { openMinutes } from "./hours.ts";

// ---------- Интересы (чипы в анкете) ----------

export const INTERESTS = {
  sea: { label: "море", kinds: [], tags: ["sea", "view"] },
  views: { label: "смотровые", kinds: [], tags: ["view"] },
  nature: { label: "прогулки", kinds: ["outdoor"], tags: ["outdoor"] },
  history: { label: "история", kinds: ["history"], tags: [] },
  culture: { label: "музеи и театры", kinds: ["culture"], tags: [] },
  art: { label: "искусство", kinds: ["creative"], tags: ["art", "workshop"] },
  music: { label: "музыка", kinds: [], tags: ["music"] },
  cinema: { label: "кино", kinds: [], tags: ["cinema"] },
  boardgames: { label: "настолки", kinds: [], tags: ["board-games"] },
  coffee: { label: "кофе", kinds: [], tags: ["coffee"] },
  food: { label: "поесть", kinds: ["food"], tags: ["food"] },
  sport: { label: "спорт", kinds: [], tags: ["sport"] },
  study: { label: "позаниматься", kinds: ["study"], tags: ["quiet", "wifi"] },
} as const satisfies Record<string, { label: string; kinds: readonly Kind[]; tags: readonly Tag[] }>;
export type Interest = keyof typeof INTERESTS;

// ---------- Входные данные ----------

export type Member = {
  name: string;
  interests: Interest[];
  budget: number; // ₽ на человека, 0 — только бесплатно
  window: { start: string; end: string }; // ISO-время, когда свободен
  from?: LatLon; // откуда поедет (район, не точный адрес)
  noClimb?: boolean; // «без крутых подъёмов»
  mood?: "calm" | "active";
};

export type EventItem = {
  id: string;
  placeId: string;
  title: string;
  start: string; // ISO
  end: string; // ISO
  price: number | null;
  tags?: Tag[];
};

export type MatchInput = {
  members: Member[];
  places: Place[];
  events?: EventItem[];
  weather?: { bad: boolean; text?: string }; // bad — туман, дождь, сильный ветер
  minStayMin?: number; // минимум времени на месте, по умолчанию 60
  climbOf?: (p: Place) => number | undefined; // подъём до места, м (если движок его посчитал)
  isNew?: (p: Place) => boolean; // место под туманом — никто там не был
};

export type MatchResult = {
  place: Place;
  event?: EventItem;
  score: number;
  perMember: { name: string; score: number; matched: string[] }[];
  travel: { name: string; minutes: number }[];
  price: number | null; // на человека
  flags: string[]; // «цена неизвестна», «часы неизвестны»…
  reason: string; // «почему вам»
};

export type MatchOutput = {
  window: { start: string; end: string } | null; // общее свободное время
  results: MatchResult[];
  hints: string[]; // если вариантов мало: что мешает
};

// ---------- Константы ----------

const CLIMB_LIMIT = 40; // м — порог для «без крутых подъёмов» (подберём на практике)
const DEFAULT_TRAVEL = 25; // мин — если не знаем, откуда человек едет
const UNKNOWN_PRICE_PENALTY = 0.1;
const UNKNOWN_HOURS_PENALTY = 0.05;
const NEW_PLACE_BONUS = 0.1;
const MOOD_BONUS = 0.05;

/** Дорога по городу на транспорте, грубо: 10 мин на ожидание + 3,5 мин на км по прямой. */
export function travelMinutes(from: LatLon | undefined, to: LatLon): number {
  return from ? Math.round(10 + (distance(from, to) / 1000) * 3.5) : DEFAULT_TRAVEL;
}

/** Цена места на человека: 0 для бесплатных, null — неизвестна. */
function priceOf(p: Place): number | null {
  if (p.priceLevel === "free") return 0;
  return p.price;
}

/** Совпадение места с интересами участника: 1 интерес — 0,5; два и больше — 1. */
function interestScore(p: Place, m: Member, extraTags: readonly string[] = []): { score: number; matched: string[] } {
  const tags = new Set<string>([...p.tags, ...extraTags]);
  const matched: string[] = [];
  for (const id of m.interests) {
    const it = INTERESTS[id];
    if (!it) continue;
    const hit = it.kinds.some((k) => p.kind.includes(k)) || it.tags.some((t) => tags.has(t));
    if (hit) matched.push(it.label);
  }
  if (!m.interests.length) return { score: 0.5, matched }; // без интересов — «мне всё равно»
  return { score: Math.min(1, matched.length / Math.min(2, m.interests.length)), matched };
}

const fmtRub = (n: number) => (n === 0 ? "бесплатно" : `${n} ₽`);

function reasonOf(r: Omit<MatchResult, "reason">, everyoneFree: boolean): string {
  const parts = r.perMember.filter((x) => x.matched.length).map((x) => `${x.name} — ${x.matched.slice(0, 2).join(" и ")}`);
  const money = r.price === 0 ? "бесплатно" : r.price != null ? `по карману всем (${fmtRub(r.price)})` : everyoneFree ? "" : "цену уточнить";
  const tail = [money, r.flags.includes("в помещении — погода плохая") ? "под крышей" : ""].filter(Boolean).join(", ");
  return [parts.join(", "), tail].filter(Boolean).join("; ") || "Подходит всем по времени и бюджету";
}

// ---------- Главная функция ----------

export function matchGroup(input: MatchInput): MatchOutput {
  const { members, places, events = [], weather, minStayMin = 60, climbOf, isNew } = input;
  if (!members.length) return { window: null, results: [], hints: ["Добавьте хотя бы одного участника"] };

  // Общее окно свободного времени.
  const start = Math.max(...members.map((m) => Date.parse(m.window.start)));
  const end = Math.min(...members.map((m) => Date.parse(m.window.end)));
  if (!(end - start >= minStayMin * 60000)) {
    return { window: null, results: [], hints: [`У компании нет общего свободного времени на ${minStayMin} минут — сдвиньте окна`] };
  }
  const window = { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
  const minBudget = Math.min(...members.map((m) => m.budget));
  const needFlat = members.some((m) => m.noClimb);
  const byId = new Map(places.map((p) => [p.id, p]));

  // Причины отсева — для подсказок.
  const drop = { budget: [] as number[], time: 0, weather: 0, climb: 0 };
  const candidates: Omit<MatchResult, "reason">[] = [];

  const consider = (place: Place, ev?: EventItem) => {
    const flags: string[] = [];
    // Бюджет.
    const price = ev ? ev.price : priceOf(place);
    if (price == null) {
      if (minBudget === 0) return void drop.budget.push(Infinity);
      flags.push("цена неизвестна");
    } else if (price > minBudget) return void drop.budget.push(price);

    // Погода.
    const indoor = place.tags.includes("indoor");
    if (weather?.bad) {
      if (!indoor) return void drop.weather++;
      flags.push("в помещении — погода плохая");
    }

    // Подъёмы.
    const climb = climbOf?.(place);
    if (needFlat && climb != null && climb > CLIMB_LIMIT) return void drop.climb++;

    // Время: каждый успевает доехать, на месте остаётся minStayMin (или событие целиком влезает).
    const travel = members.map((m) => ({ name: m.name, minutes: travelMinutes(m.from, place) }));
    const maxTravel = Math.max(...travel.map((t) => t.minutes));
    const arrive = start + maxTravel * 60000;
    if (ev) {
      if (Date.parse(ev.start) < arrive || Date.parse(ev.end) > end) return void drop.time++;
    } else {
      if (end - arrive < minStayMin * 60000) return void drop.time++;
      const open = openMinutes(place.hours, new Date(arrive), new Date(end));
      if (open == null) {
        if (!place.kind.includes("outdoor")) flags.push("часы неизвестны");
      } else if (open < minStayMin) return void drop.time++;
    }

    // Оценка.
    const perMember = members.map((m) => ({ name: m.name, ...interestScore(place, m, ev?.tags) }));
    const scores = perMember.map((x) => x.score);
    let score = Math.min(...scores) * 0.6 + (scores.reduce((a, b) => a + b, 0) / scores.length) * 0.4;
    if (flags.includes("цена неизвестна")) score -= UNKNOWN_PRICE_PENALTY;
    if (flags.includes("часы неизвестны")) score -= UNKNOWN_HOURS_PENALTY;
    if (isNew?.(place)) score += NEW_PLACE_BONUS;
    const calm = place.tags.includes("quiet") || place.kind.includes("culture");
    const active = place.kind.includes("outdoor") || place.tags.includes("sport");
    for (const m of members) {
      if (m.mood === "calm" && calm) score += MOOD_BONUS / members.length;
      if (m.mood === "active" && active) score += MOOD_BONUS / members.length;
    }
    // Дорога: кому-то ехать дольше 30 минут — небольшой штраф (час в пути ≈ −0,1).
    score -= Math.max(0, maxTravel - 30) / 300;
    score = Math.max(0, Math.min(1, score));
    candidates.push({ place, event: ev, score: +score.toFixed(3), perMember, travel, price, flags });
  };

  for (const p of places) consider(p);
  for (const ev of events) {
    const p = byId.get(ev.placeId);
    if (p) consider(p, ev);
  }

  // Разнообразие: сначала по одному лучшему каждого основного типа, потом добор по очкам.
  candidates.sort((a, b) => b.score - a.score);
  const picked: typeof candidates = [];
  const kinds = new Set<string>();
  for (const c of candidates) {
    if (picked.length === 3) break;
    const k = c.event ? "event" : c.place.kind[0];
    if (!kinds.has(k)) { picked.push(c); kinds.add(k); }
  }
  for (const c of candidates) {
    if (picked.length === 3) break;
    if (!picked.includes(c)) picked.push(c);
  }
  // По возможности один бесплатный вариант среди трёх (из достойных — в первой десятке).
  if (picked.length === 3 && !picked.some((c) => c.price === 0)) {
    const free = candidates.slice(0, 10).find((c) => c.price === 0);
    if (free) picked[2] = free;
  }
  picked.sort((a, b) => b.score - a.score);

  const results = picked.map((c) => ({ ...c, reason: reasonOf(c, minBudget === 0) }));

  // Подсказки, если вариантов меньше трёх.
  const hints: string[] = [];
  if (results.length < 3) {
    const affordable = drop.budget.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
    if (affordable.length) {
      const target = affordable[Math.min(affordable.length - 1, 2)];
      const n = affordable.filter((x) => x <= target).length;
      hints.push(`Если поднять бюджет до ${target} ₽, появится ещё ${n} ${plural(n, "вариант", "варианта", "вариантов")}`);
    }
    if (drop.weather) hints.push(`В хорошую погоду подошло бы ещё ${drop.weather} ${plural(drop.weather, "место", "места", "мест")} на улице`);
    if (drop.time) hints.push(`${drop.time} ${plural(drop.time, "место", "места", "мест")} не подошли по времени — можно расширить общее окно`);
    if (drop.climb) hints.push(`${drop.climb} ${plural(drop.climb, "место", "места", "мест")} отсеяны из-за подъёмов`);
  }
  return { window, results, hints };
}

function plural(n: number, one: string, few: string, many: string) {
  const a = n % 10, b = n % 100;
  if (a === 1 && b !== 11) return one;
  if (a >= 2 && a <= 4 && (b < 12 || b > 14)) return few;
  return many;
}
