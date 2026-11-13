import type { AvatarItem } from "./types.ts";

// Косметика для аватара: только внешний вид, игровых преимуществ не даёт.
// Ассеты рисует Макс (docs/brief-max.md, раздел про магазин); пока пути — заглушки, интерфейс показывает имя и редкость.
export const AVATAR_ITEMS: readonly AvatarItem[] = [
  // Голова
  { id: "admiral-cap", name: "Фуражка Адмирала", slot: "head", asset: "assets/avatar/admiral-cap.svg", rarity: "common" },
  { id: "knit-hat", name: "Вязаная шапка", slot: "head", asset: "assets/avatar/knit-hat.svg", rarity: "common" },
  { id: "fog-hood", name: "Капюшон тумана", slot: "head", asset: "assets/avatar/fog-hood.svg", rarity: "rare" },
  { id: "lighthouse-crown", name: "Корона смотрителя маяка", slot: "head", asset: "assets/avatar/lighthouse-crown.svg", rarity: "legendary" },
  // Верх
  { id: "sailor-stripes", name: "Тельняшка", slot: "top", asset: "assets/avatar/sailor-stripes.svg", rarity: "common" },
  { id: "windbreaker", name: "Ветровка с набережной", slot: "top", asset: "assets/avatar/windbreaker.svg", rarity: "common" },
  { id: "captain-coat", name: "Китель капитана", slot: "top", asset: "assets/avatar/captain-coat.svg", rarity: "rare" },
  { id: "golden-horn-jacket", name: "Куртка «Золотой Рог»", slot: "top", asset: "assets/avatar/golden-horn-jacket.svg", rarity: "legendary" },
  // Низ
  { id: "cargo-pants", name: "Карго", slot: "bottom", asset: "assets/avatar/cargo-pants.svg", rarity: "common" },
  { id: "deck-trousers", name: "Палубные брюки", slot: "bottom", asset: "assets/avatar/deck-trousers.svg", rarity: "rare" },
  // Аксессуар
  { id: "compass", name: "Компас", slot: "accessory", asset: "assets/avatar/compass.svg", rarity: "common" },
  { id: "crab-badge", name: "Значок-краб", slot: "accessory", asset: "assets/avatar/crab-badge.svg", rarity: "common" },
  { id: "spyglass", name: "Подзорная труба", slot: "accessory", asset: "assets/avatar/spyglass.svg", rarity: "rare" },
  { id: "admiral-cat", name: "Кот Адмирал на плече", slot: "accessory", asset: "assets/avatar/admiral-cat.svg", rarity: "legendary" },
  // Рамка профиля
  { id: "frame-fog", name: "Рамка «Туман»", slot: "frame", asset: "assets/avatar/frame-fog.svg", rarity: "common" },
  { id: "frame-hills", name: "Рамка «Сопки»", slot: "frame", asset: "assets/avatar/frame-hills.svg", rarity: "rare" },
  { id: "frame-golden-bridge", name: "Рамка «Золотой мост»", slot: "frame", asset: "assets/avatar/frame-golden-bridge.svg", rarity: "legendary" },
];

export function avatarItemById(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find((item) => item.id === id);
}
