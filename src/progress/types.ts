export const AVATAR_SLOTS = ["head", "top", "bottom", "accessory", "frame"] as const;
export type AvatarSlot = (typeof AVATAR_SLOTS)[number];

export type Reward = {
  xp: number;
  cash: number;
  rep: number;
  items: string[];
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

export type ProgressState = {
  version: 1;
  xp: number;
  level: number;
  cash: number;
  rep: number;
  inventory: Record<string, number>;
  equipped: Partial<Record<AvatarSlot, string>>;
  completedQuests: Record<string, QuestCompletion>;
};

export type RewardResult = {
  questId: string;
  granted: boolean;
  reason?: "already-completed" | "untrusted-quest";
  reward: Reward;
  newItems: string[];
  state: ProgressState;
};

export type ProgressEvent =
  | { type: "progressChanged"; state: ProgressState }
  | { type: "rewardGranted"; result: RewardResult }
  | { type: "inventoryChanged"; inventory: Record<string, number>; equipped: ProgressState["equipped"] };
