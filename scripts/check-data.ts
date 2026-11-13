// Проверка data/places.json: схема каждой записи и уникальность id.
// Запуск: npm run data:check (код выхода 1, если есть ошибки).

import { readFile } from "node:fs/promises";
import { validatePlace, type Place } from "../src/data/place.ts";

const places = JSON.parse(await readFile("data/places.json", "utf8")) as Place[];
let errors = 0;
const ids = new Set<string>();
for (const p of places) {
  const errs = validatePlace(p);
  if (ids.has(p.id)) errs.push("id повторяется");
  ids.add(p.id);
  if (errs.length) {
    errors += errs.length;
    console.log(`✗ ${p.id} «${p.name}»: ${errs.join("; ")}`);
  }
}
const verified = places.filter((p) => p.verified).length;
const free = places.filter((p) => p.priceLevel === "free").length;
const study = places.filter((p) => p.kind.includes("study")).length;
console.log(`Мест: ${places.length} · проверено человеком: ${verified} · бесплатно: ${free} · для учёбы: ${study} · ошибок: ${errors}`);
process.exit(errors ? 1 : 0);
