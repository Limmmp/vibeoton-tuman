import type { AvatarItem } from "./types.ts";

export const AVATAR_ITEMS: readonly AvatarItem[] = [
  {
    id: "admiral-cap",
    name: "Фуражка Адмирала",
    slot: "head",
    asset: "assets/avatar/admiral-cap.svg",
    rarity: "common",
  },
];

export function avatarItemById(id: string): AvatarItem | undefined {
  return AVATAR_ITEMS.find((item) => item.id === id);
}
