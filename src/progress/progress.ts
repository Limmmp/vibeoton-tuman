import { AVATAR_SLOTS, type AvatarSlot, type ProgressEvent, type ProgressState, type Reward, type RewardResult } from "./types.ts";
import { avatarItemById } from "./catalog.ts";

export const EMPTY_PROGRESS: ProgressState = {
  version: 1,
  xp: 0,
  level: 1,
  cash: 0,
  rep: 0,
  inventory: {},
  equipped: {},
  completedQuests: {},
  claimed: {},
};

type ProgressOptions = {
  initial?: ProgressState;
  emit?: (event: ProgressEvent) => void;
  save?: (state: ProgressState) => void;
  now?: () => Date;
};

export class ProgressManager {
  private value: ProgressState;
  private emit: (event: ProgressEvent) => void;
  private save: (state: ProgressState) => void;
  private now: () => Date;

  constructor(options: ProgressOptions = {}) {
    this.value = normalizeState(options.initial ?? EMPTY_PROGRESS);
    this.emit = options.emit ?? (() => {});
    this.save = options.save ?? (() => {});
    this.now = options.now ?? (() => new Date());
  }

  get state(): ProgressState {
    return structuredClone(this.value);
  }

  grantQuestReward(input: { questId: string; title: string; reward: Reward; trusted: boolean }): RewardResult {
    const reward = normalizeReward(input.reward, input.trusted);
    if (!input.trusted) return this.denied(input.questId, reward, "untrusted-quest");
    if (this.value.completedQuests[input.questId]) return this.denied(input.questId, reward, "already-completed");

    const newItems = reward.items.filter((id) => !this.value.inventory[id]);
    this.value.xp += reward.xp;
    this.value.level = levelForXp(this.value.xp);
    this.value.cash += reward.cash;
    this.value.rep += reward.rep;
    for (const id of reward.items) this.value.inventory[id] = (this.value.inventory[id] ?? 0) + 1;
    this.value.completedQuests[input.questId] = {
      questId: input.questId,
      title: input.title,
      completedAt: this.now().toISOString(),
      reward,
    };
    this.persist();

    const result = this.result(input.questId, reward, true, undefined, newItems);
    this.emit({ type: "rewardGranted", result });
    if (reward.items.length) this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return result;
  }

  /** Награда не за квест (веха района, чекин). Один ключ — одна выдача. */
  grantReward(input: { key: string; source: "district" | "checkin"; title: string; reward: Reward; trusted: boolean }): RewardResult {
    const reward = normalizeReward(input.reward, input.trusted);
    const meta = { source: input.source, title: input.title };
    if (!input.trusted) return this.denied(input.key, reward, "untrusted-quest", meta);
    if (this.value.claimed[input.key]) return this.denied(input.key, reward, "already-completed", meta);

    const newItems = reward.items.filter((id) => !this.value.inventory[id]);
    this.value.xp += reward.xp;
    this.value.level = levelForXp(this.value.xp);
    this.value.cash += reward.cash;
    this.value.rep += reward.rep;
    for (const id of reward.items) this.value.inventory[id] = (this.value.inventory[id] ?? 0) + 1;
    this.value.claimed[input.key] = { key: input.key, source: input.source, title: input.title, claimedAt: this.now().toISOString(), reward };
    this.persist();

    const result = { ...this.result(input.key, reward, true, undefined, newItems), ...meta };
    this.emit({ type: "rewardGranted", result });
    if (reward.items.length) this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return result;
  }

  /** Выдавалась ли уже награда с этим ключом. */
  isClaimed(key: string): boolean {
    return !!this.value.claimed[key];
  }

  equip(itemId: string): ProgressState {
    const item = avatarItemById(itemId);
    if (!item) throw new Error(`Неизвестный предмет: ${itemId}`);
    if (!this.value.inventory[itemId]) throw new Error(`Предмет не получен: ${itemId}`);
    this.value.equipped[item.slot] = itemId;
    this.persist();
    this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return this.state;
  }

  unequip(slot: AvatarSlot): ProgressState {
    if (!(AVATAR_SLOTS as readonly string[]).includes(slot)) throw new Error(`Неизвестный слот: ${slot}`);
    delete this.value.equipped[slot];
    this.persist();
    this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return this.state;
  }

  reset(): ProgressState {
    this.value = structuredClone(EMPTY_PROGRESS);
    this.persist();
    this.emit({ type: "inventoryChanged", inventory: {}, equipped: {} });
    return this.state;
  }

  private denied(questId: string, reward: Reward, reason: NonNullable<RewardResult["reason"]>, meta: Pick<RewardResult, "source" | "title"> = {}) {
    const result = { ...this.result(questId, reward, false, reason, []), ...meta };
    this.emit({ type: "rewardGranted", result });
    return result;
  }

  private result(questId: string, reward: Reward, granted: boolean, reason: RewardResult["reason"], newItems: string[]): RewardResult {
    return { questId, granted, ...(reason ? { reason } : {}), reward, newItems, state: this.state };
  }

  private persist() {
    this.save(this.state);
    this.emit({ type: "progressChanged", state: this.state });
  }
}

export function levelForXp(xp: number): number {
  return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1;
}

function normalizeReward(reward: Reward, validateItems = true): Reward {
  const items = [...new Set(reward.items)].filter((id) => {
    if (validateItems && !avatarItemById(id)) throw new Error(`Награда содержит неизвестный предмет: ${id}`);
    return !validateItems || !!avatarItemById(id);
  });
  return {
    xp: clampInt(reward.xp, 0, 1_000_000),
    cash: clampInt(reward.cash, 0, 1_000_000),
    rep: clampInt(reward.rep, 0, 100_000),
    items,
  };
}

function normalizeState(state: ProgressState): ProgressState {
  const xp = clampInt(state.xp, 0, Number.MAX_SAFE_INTEGER);
  return {
    version: 1,
    xp,
    level: levelForXp(xp),
    cash: clampInt(state.cash, 0, Number.MAX_SAFE_INTEGER),
    rep: clampInt(state.rep, 0, Number.MAX_SAFE_INTEGER),
    inventory: { ...(state.inventory ?? {}) },
    equipped: { ...(state.equipped ?? {}) },
    completedQuests: { ...(state.completedQuests ?? {}) },
    claimed: { ...(state.claimed ?? {}) }, // в сохранениях до районов поля нет
  };
}

function clampInt(value: number, min: number, max: number) {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.max(min, Math.min(max, n));
}
