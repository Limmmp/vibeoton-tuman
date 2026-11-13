export const AVATAR_SLOTS = ["head", "top", "bottom", "accessory", "frame"] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

export type Reward = {
  xp: number;
  cash: number;
  rep: number;
  items: string[];
};

export type AvatarAppearance = {
  bodyColor: string;
  accentColor: string;
  equipped: Partial<Record<AvatarSlot, string>>;
  modelUrl?: string;
};

export type AvatarItem = {
  id: string;
  name: string;
  slot: AvatarSlot;
  asset: string;
  rarity: "common" | "rare" | "legendary";
};

export type QuestCompletion = {
  questId: string;
  title: string;
  completedAt: string;
  reward: Reward;
};

/** Награда не за квест: веха района, первый чекин в месте. Ключ уникален, второй раз не выдаётся. */
export type RewardSource = "quest" | "district" | "checkin";
export type Claim = {
  key: string; // "district:center:25", "checkin:osm-n123"
  source: Exclude<RewardSource, "quest">;
  title: string;
  claimedAt: string;
  reward: Reward;
};

export type ProgressState = {
  version: 1;
  xp: number;
  level: number;
  cash: number;
  rep: number;
  inventory: Record<string, number>;
  equipped: Partial<Record<AvatarSlot, string>>;
  completedQuests: Record<string, QuestCompletion>;
  claimed: Record<string, Claim>;
};

export type RewardResult = {
  questId: string; // для наград не за квест — ключ награды (Claim.key)
  source?: RewardSource;
  title?: string;
  granted: boolean;
  reason?: "already-completed" | "untrusted-quest";
  reward: Reward;
  newItems: string[];
  state: ProgressState;
};

export type ProgressEvent =
  | { type: "progressChanged"; state: ProgressState }
  | { type: "rewardGranted"; result: RewardResult }
  | { type: "inventoryChanged"; inventory: Record<string, number>; equipped: ProgressState["equipped"] }
  | { type: "avatarChanged"; appearance: AvatarAppearance };
