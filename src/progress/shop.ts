// Магазин вещей для аватара и гача (крутки наборов). Только за игровую валюту — никаких реальных денег.
//
//  - Баннер — набор вещей с одной темой. Крутка ×1 / ×10 за монеты; ×10 со скидкой.
//  - Шансы открыты: обычная 70 %, редкая 25 %, легендарная 5 %. Внутри редкости — равновероятно.
//  - Гарантия: легендарная вещь не позже PITY-й крутки баннера без легендарки; счётчик виден игроку.
//  - Дубликат превращается в осколки; за осколки (или монеты) вещь можно купить напрямую на витрине.
// Чистая логика: состояние и генератор случайных чисел передаются снаружи (тестируемо).

import { AVATAR_ITEMS, avatarItemById } from "./catalog.ts";
import type { AvatarItem } from "./types.ts";

export type Rarity = AvatarItem["rarity"];

export const RATES: Record<Rarity, number> = { common: 0.7, rare: 0.25, legendary: 0.05 };
export const PITY = 30;
export const DUPLICATE_SHARDS: Record<Rarity, number> = { common: 5, rare: 15, legendary: 50 };
/** Прямая покупка на витрине. Легендарки за монеты не продаются — только гача или осколки. */
export const SHOP_PRICE: Record<Rarity, { cash: number | null; shards: number }> = {
  common: { cash: 150, shards: 30 },
  rare: { cash: 450, shards: 90 },
  legendary: { cash: null, shards: 300 },
};

export type Banner = { id: string; title: string; items: string[]; price1: number; price10: number };

export const BANNERS: readonly Banner[] = [
  {
    id: "port",
    title: "Портовый набор",
    items: ["admiral-cap", "sailor-stripes", "cargo-pants", "compass", "crab-badge", "captain-coat", "deck-trousers", "spyglass", "admiral-cat", "frame-fog"],
    price1: 100,
    price10: 900,
  },
  {
    id: "fog",
    title: "Туманный набор",
    items: ["knit-hat", "windbreaker", "frame-fog", "fog-hood", "frame-hills", "lighthouse-crown", "golden-horn-jacket", "frame-golden-bridge", "compass"],
    price1: 100,
    price10: 900,
  },
];

export function bannerById(id: string) {
  return BANNERS.find((b) => b.id === id);
}

export type PullResult = { itemId: string; rarity: Rarity; duplicate: boolean; shards: number };

/** Выбрать редкость одной крутки с учётом гарантии. pitySoFar — круток подряд без легендарки. */
export function rollRarity(rand: () => number, pitySoFar: number): Rarity {
  if (pitySoFar + 1 >= PITY) return "legendary";
  const r = rand();
  if (r < RATES.legendary) return "legendary";
  if (r < RATES.legendary + RATES.rare) return "rare";
  return "common";
}

/**
 * Крутки баннера. Меняет переданные inventory и pity (по ссылке) и возвращает результаты.
 * Если в баннере нет вещей нужной редкости — берётся ближайшая более частая редкость.
 */
export function pull(banner: Banner, count: number, rand: () => number, inventory: Record<string, number>, pity: Record<string, number>): PullResult[] {
  const byRarity: Record<Rarity, string[]> = { common: [], rare: [], legendary: [] };
  for (const id of banner.items) {
    const item = avatarItemById(id);
    if (item) byRarity[item.rarity].push(id);
  }
  const out: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    let rarity = rollRarity(rand, pity[banner.id] ?? 0);
    const order: Rarity[] = rarity === "legendary" ? ["legendary", "rare", "common"] : rarity === "rare" ? ["rare", "common"] : ["common", "rare"];
    rarity = order.find((r) => byRarity[r].length) ?? "common";
    const pool = byRarity[rarity];
    const itemId = pool[Math.floor(rand() * pool.length) % pool.length];
    const duplicate = (inventory[itemId] ?? 0) > 0;
    inventory[itemId] = (inventory[itemId] ?? 0) + 1;
    pity[banner.id] = rarity === "legendary" ? 0 : (pity[banner.id] ?? 0) + 1;
    out.push({ itemId, rarity, duplicate, shards: duplicate ? DUPLICATE_SHARDS[rarity] : 0 });
  }
  return out;
}

/** Описание магазина для интерфейса: баннеры с открытыми шансами, гарантией и витрина. */
export function shopInfo(pity: Record<string, number>, inventory: Record<string, number>) {
  return {
    rates: RATES,
    pity: PITY,
    duplicateShards: DUPLICATE_SHARDS,
    banners: BANNERS.map((b) => ({ ...b, pityCounter: pity[b.id] ?? 0, pullsToGuarantee: PITY - (pity[b.id] ?? 0) })),
    showcase: AVATAR_ITEMS.map((item) => ({ ...item, price: SHOP_PRICE[item.rarity], owned: (inventory[item.id] ?? 0) > 0 })),
  };
}
