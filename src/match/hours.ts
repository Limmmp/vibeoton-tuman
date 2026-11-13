// Минимальный разбор часов работы в формате OSM opening_hours — то, что реально встречается в каталоге:
//   "Mo-Fr 10:00-20:00; Sa 10:00-18:00", "Su-Fr 11:00-19:00", "Mo,We 09:00-13:00,14:00-18:00",
//   "Mo-Su 10:00-02:00" (через полночь), "24/7", "Su off".
// Всё, что сложнее (праздники, недели, сезоны), считаем «неизвестно» (null), а не гадаем.
// Время — местное время Владивостока (UTC+10), независимо от часового пояса устройства.

export const VVO_OFFSET_MIN = 10 * 60;
const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]; // индекс = getUTCDay()

type Interval = { start: number; end: number }; // минуты от начала недели (вс 00:00), end > start
const WEEK = 7 * 24 * 60;

function parseDays(s: string): number[] | null {
  const out = new Set<number>();
  for (const part of s.split(",")) {
    const m = part.match(/^(Mo|Tu|We|Th|Fr|Sa|Su)(?:-(Mo|Tu|We|Th|Fr|Sa|Su))?$/);
    if (!m) return null;
    const a = DAYS.indexOf(m[1]);
    const b = m[2] ? DAYS.indexOf(m[2]) : a;
    for (let d = a; ; d = (d + 1) % 7) {
      out.add(d);
      if (d === b) break;
    }
  }
  return [...out];
}

function parseTimes(s: string): [number, number][] | null {
  const out: [number, number][] = [];
  for (const part of s.split(",")) {
    const m = part.match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
    if (!m) return null;
    const a = +m[1] * 60 + +m[2];
    let b = +m[3] * 60 + +m[4];
    if (b <= a) b += 24 * 60; // через полночь
    out.push([a, b]);
  }
  return out;
}

/** Разобрать строку часов в интервалы недели. null — формат не поддержан. */
export function parseHours(src: string | null | undefined): Interval[] | null {
  if (!src) return null;
  const s = src.trim();
  if (s === "24/7") return [{ start: 0, end: WEEK }];
  // Правила через «;» — более позднее правило для тех же дней заменяет раннее (как в OSM).
  const byDay = new Map<number, [number, number][]>();
  for (const rule of s.split(";").map((r) => r.trim()).filter(Boolean)) {
    const m = rule.match(/^(?:([A-Za-z,-]+)\s+)?(.+)$/);
    if (!m) return null;
    const days = m[1] ? parseDays(m[1]) : [0, 1, 2, 3, 4, 5, 6];
    if (!days) return null;
    const tail = m[2].trim();
    const times = /^(off|closed)$/i.test(tail) ? [] : parseTimes(tail);
    if (!times) return null;
    for (const d of days) byDay.set(d, times);
  }
  const out: Interval[] = [];
  for (const [d, times] of byDay) for (const [a, b] of times) out.push({ start: d * 1440 + a, end: d * 1440 + b });
  return out;
}

/** Момент времени → минуты от начала недели по времени Владивостока. */
export function weekMinute(t: Date): number {
  const local = new Date(t.getTime() + VVO_OFFSET_MIN * 60000);
  return local.getUTCDay() * 1440 + local.getUTCHours() * 60 + local.getUTCMinutes();
}

/**
 * Сколько минут место открыто в промежутке [from, to]. null — часы неизвестны.
 * Промежуток не длиннее недели.
 */
export function openMinutes(hours: string | null | undefined, from: Date, to: Date): number | null {
  const iv = parseHours(hours);
  if (!iv) return null;
  const len = Math.max(0, Math.round((to.getTime() - from.getTime()) / 60000));
  if (!len) return 0;
  const a = weekMinute(from);
  const b = a + len;
  let total = 0;
  // Интервалы повторяются каждую неделю: проверяем сдвиги на −1, 0, +1 неделю.
  for (const { start, end } of iv)
    for (const shift of [-WEEK, 0, WEEK]) total += Math.max(0, Math.min(b, end + shift) - Math.max(a, start + shift));
  return Math.min(total, len);
}
