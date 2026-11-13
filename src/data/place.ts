// Каталог мест: тип записи и проверка. Общий контракт для движка, «Компании», «Мест» и помощника.
// Файл данных — data/places.json (массив Place). Скрипты: npm run data:fetch | data:build | data:check.
// Пишется только «стираемым» TypeScript (без enum и т.п.), чтобы его можно было запускать прямо в Node.

export const KINDS = ["study", "creative", "leisure", "culture", "history", "food", "outdoor"] as const;
export type Kind = (typeof KINDS)[number];

export const PRICE_LEVELS = ["free", "low", "mid", "high", "unknown"] as const; // low ≤ 300 ₽, mid ≤ 1000 ₽
export type PriceLevel = (typeof PRICE_LEVELS)[number];

export const TAGS = [
  "wifi", "sockets", "quiet", "noise-ok", "laptop-ok", // учёба и работа
  "indoor", "outdoor", "view", "sea", // где и что видно
  "coffee", "food", "board-games", "music", "art", "workshop", "sport", "cinema", // чем заняться
  "wheelchair", // доступность
] as const;
export type Tag = (typeof TAGS)[number];

export type Place = {
  id: string; // латиница, через дефис; для мест из OSM — "osm-n123" / "osm-w123" / "osm-r123"
  name: string;
  lat: number;
  lon: number;
  kind: Kind[]; // первый — основной (цвет метки)
  price: number | null; // ₽ за посещение на человека; null — неизвестно
  priceLevel: PriceLevel;
  tags: Tag[];
  hours: string | null; // формат opening_hours из OSM, например "Mo-Fr 10:00-20:00"
  address?: string;
  website?: string;
  photo: string | null;
  source: string; // откуда данные (ссылка)
  osm?: string; // "node/123" — чтобы обновлять из OSM
  checkedAt: string | null; // дата проверки человеком, YYYY-MM-DD
  verified: boolean; // true ставит только человек, проверив место
  manual?: boolean; // запись заведена или исправлена вручную — скрипт сборки её не перезаписывает
  notes?: string; // для команды: что проверить, сомнения
};

// Владивосток вместе с Русским островом — точки вне рамки считаем ошибкой.
export const CITY_BBOX = { s: 42.93, w: 131.72, n: 43.32, e: 132.18 };

/** Проверка одной записи. Возвращает список проблем (пустой — всё хорошо). */
export function validatePlace(p: Place): string[] {
  const errs: string[] = [];
  const bad = (m: string) => errs.push(m);
  if (!/^[a-z0-9][a-z0-9-]*$/.test(p.id ?? "")) bad("id: латиница в нижнем регистре, цифры и дефис");
  if (!p.name?.trim()) bad("name пустое");
  if (!(p.lat >= CITY_BBOX.s && p.lat <= CITY_BBOX.n && p.lon >= CITY_BBOX.w && p.lon <= CITY_BBOX.e)) bad("координаты вне Владивостока");
  if (!Array.isArray(p.kind) || !p.kind.length) bad("kind пустой");
  else p.kind.forEach((k) => (KINDS as readonly string[]).includes(k) || bad(`kind: неизвестное значение "${k}"`));
  if (!(PRICE_LEVELS as readonly string[]).includes(p.priceLevel)) bad(`priceLevel: "${p.priceLevel}"`);
  if (p.price != null && !(p.price >= 0)) bad("price: отрицательная цена");
  if (p.price === 0 && p.priceLevel !== "free") bad("price 0, но priceLevel не free");
  (p.tags ?? []).forEach((t) => (TAGS as readonly string[]).includes(t) || bad(`tags: неизвестный тег "${t}"`));
  if (!/^https?:\/\//.test(p.source ?? "")) bad("source: нужна ссылка на источник");
  if (p.verified && !p.checkedAt) bad("verified без checkedAt");
  if (p.checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt)) bad("checkedAt: формат YYYY-MM-DD");
  return errs;
}
