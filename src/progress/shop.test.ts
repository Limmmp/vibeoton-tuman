// Тесты магазина и гачи. Запуск: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { ProgressManager } from "./progress.ts";
import { BANNERS, PITY, RATES, rollRarity } from "./shop.ts";
import { avatarItemById } from "./catalog.ts";

const seq = (...xs: number[]) => { let i = 0; return () => xs[i++ % xs.length]; };
const rich = () => new ProgressManager({ initial: { version: 1, xp: 0, level: 1, cash: 5000, inventory: {}, equipped: {}, completedQuests: {}, claimed: {}, shards: 0, pity: {} } });

test("гача: шансы суммируются в 100 %, вещи баннеров есть в каталоге", () => {
  assert.equal(Math.round((RATES.common + RATES.rare + RATES.legendary) * 100), 100);
  for (const b of BANNERS) for (const id of b.items) assert.ok(avatarItemById(id), `${b.id}: ${id}`);
});

test("гача: редкость по броску и гарантия легендарки на PITY-й крутке", () => {
  assert.equal(rollRarity(() => 0.01, 0), "legendary");
  assert.equal(rollRarity(() => 0.2, 0), "rare");
  assert.equal(rollRarity(() => 0.9, 0), "common");
  assert.equal(rollRarity(() => 0.99, PITY - 1), "legendary");
});

test("гача: крутка списывает монеты, дубликаты дают осколки, гарантия срабатывает", () => {
  const p = rich();
  // Все броски «обычная» — пока не сработает гарантия.
  const res = p.gachaPull("port", 10, seq(0.9, 0.0));
  assert.equal(res.spent, 900);
  assert.equal(p.state.cash, 4100);
  const dups = res.results.filter((r) => r.duplicate);
  assert.equal(p.state.shards, dups.reduce((s, r) => s + r.shards, 0));
  assert.ok(dups.length > 0); // одна и та же обычная вещь выпадала много раз
  assert.equal(p.state.pity.port, 10);
  // Ещё 20 круток без легендарки — 30-я обязана быть легендарной.
  const res2 = p.gachaPull("port", 10, seq(0.9, 0.0));
  const res3 = p.gachaPull("port", 10, seq(0.9, 0.0));
  assert.equal(res2.results.some((r) => r.rarity === "legendary"), false);
  assert.equal(res3.results.at(-1)!.rarity, "legendary");
  assert.equal(p.state.pity.port, 0);
});

test("магазин: не хватает монет — ошибка, состояние не меняется", () => {
  const p = new ProgressManager();
  assert.throws(() => p.gachaPull("port", 1), /Не хватает монет/);
  assert.equal(p.state.cash, 0);
});

test("магазин: витрина за монеты и осколки, легендарки за монеты не продаются", () => {
  const p = rich();
  p.buyItem("knit-hat", "cash");
  assert.equal(p.state.cash, 4850);
  assert.ok(p.state.inventory["knit-hat"]);
  assert.throws(() => p.buyItem("knit-hat", "cash"), /уже есть/);
  assert.throws(() => p.buyItem("admiral-cat", "cash"), /нельзя купить за монеты/);
  assert.throws(() => p.buyItem("admiral-cat", "shards"), /Не хватает осколков/);
});
