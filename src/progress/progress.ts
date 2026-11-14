import { AVATAR_SLOTS, type AvatarSlot, type ProgressEvent, type ProgressState, type Reward, type RewardResult } from "./types.ts";
import { avatarItemById } from "./catalog.ts";
import { SHOP_PRICE, bannerById, pull, type PullResult } from "./shop.ts";
import { levelProgress } from "./level.ts";

// Журнал хранится вместе с XP, но не пересылается в WebView-событиях и HUD.
export type ProgressSave = ProgressState & { exploration?: { seen: string[]; cells: number } };

export const EMPTY_PROGRESS: ProgressState = {
  version: 1,
  xp: 0,
  level: 1,
  cash: 0,
  inventory: {},
  equipped: {},
  completedQuests: {},
  claimed: {},
  shards: 0,
  pity: {},
};

type ProgressOptions = {
  initial?: ProgressSave;
  knownExplorationCells?: Iterable<string>;
  emit?: (event: ProgressEvent) => void;
  save?: (state: ProgressSave) => void;
  now?: () => Date;
};

export class ProgressManager {
  private exploredCells: Set<string>;
  private explorationCells: number;
  private value: ProgressState;
  private emit: (event: ProgressEvent) => void;
  private save: (state: ProgressSave) => void;
  private now: () => Date;

  constructor(options: ProgressOptions = {}) {
    this.value = normalizeState(options.initial ?? EMPTY_PROGRESS);
    this.exploredCells = new Set([...(options.initial?.exploration?.seen ?? []), ...(options.knownExplorationCells ?? [])]);
    this.explorationCells = clampInt(options.initial?.exploration?.cells ?? 0, 0, this.exploredCells.size);
    this.emit = options.emit ?? (() => {});
    this.save = options.save ?? (() => {});
    this.now = options.now ?? (() => new Date());
  }

  get state(): ProgressState {
    return structuredClone(this.value);
  }

  /** 1 XP за новую ячейку, включая исследование в симуляции. Старые открытия не награждаются повторно. */
  recordExploration(keys: Iterable<string>, _gps?: boolean): number {
    let fresh = 0;
    for (const key of keys) {
      if (this.exploredCells.has(key)) continue;
      this.exploredCells.add(key);
      fresh++;
    }
    if (!fresh) return 0;
    this.explorationCells += fresh;
    const xp = fresh;
    this.value.xp += xp;
    this.value.level = levelForXp(this.value.xp);
    // Все открытые ячейки помним: сброс тумана не превращает их в новые открытия.
    this.persist(xp > 0);
    return xp;
  }

  grantQuestReward(input: { questId: string; title: string; reward: Reward; trusted: boolean }): RewardResult {
    const reward = normalizeReward(input.reward, input.trusted);
    if (!input.trusted) return this.denied(input.questId, reward, "untrusted-quest");
    if (this.value.completedQuests[input.questId]) return this.denied(input.questId, reward, "already-completed");

    const newItems = reward.items.filter((id) => !this.value.inventory[id]);
    this.value.xp += reward.xp;
    this.value.level = levelForXp(this.value.xp);
    this.value.cash += reward.cash;    for (const id of reward.items) this.value.inventory[id] = (this.value.inventory[id] ?? 0) + 1;
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
    this.value.cash += reward.cash;    for (const id of reward.items) this.value.inventory[id] = (this.value.inventory[id] ?? 0) + 1;
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

  /** Крутки баннера за монеты. count — 1 или 10 (×10 со скидкой). */
  gachaPull(bannerId: string, count: 1 | 10, rand: () => number = Math.random): { results: PullResult[]; spent: number; state: ProgressState } {
    const banner = bannerById(bannerId);
    if (!banner) throw new Error(`Неизвестный набор: ${bannerId}`);
    if (count !== 1 && count !== 10) throw new Error("Крутить можно 1 или 10 раз");
    const price = count === 10 ? banner.price10 : banner.price1;
    if (this.value.cash < price) throw new Error(`Не хватает монет: нужно ${price}, есть ${this.value.cash}`);
    this.value.cash -= price;
    const results = pull(banner, count, rand, this.value.inventory, this.value.pity);
    this.value.shards += results.reduce((s, r) => s + r.shards, 0);
    this.persist();
    this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return { results, spent: price, state: this.state };
  }

  /** Купить вещь на витрине за монеты или осколки. Легендарки за монеты не продаются. */
  buyItem(itemId: string, currency: "cash" | "shards"): ProgressState {
    const item = avatarItemById(itemId);
    if (!item) throw new Error(`Неизвестный предмет: ${itemId}`);
    if (this.value.inventory[itemId]) throw new Error("Эта вещь уже есть");
    const price = SHOP_PRICE[item.rarity][currency];
    if (price == null) throw new Error("Эту вещь нельзя купить за монеты — только в наборе или за осколки");
    const have = currency === "cash" ? this.value.cash : this.value.shards;
    if (have < price) throw new Error(`Не хватает ${currency === "cash" ? "монет" : "осколков"}: нужно ${price}, есть ${have}`);
    if (currency === "cash") this.value.cash -= price; else this.value.shards -= price;
    this.value.inventory[itemId] = 1;
    this.persist();
    this.emit({ type: "inventoryChanged", inventory: { ...this.value.inventory }, equipped: { ...this.value.equipped } });
    return this.state;
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
    this.explorationCells = 0;
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

  private persist(notify = true) {
    this.save({ ...this.state, exploration: { seen: [...this.exploredCells], cells: this.explorationCells } });
    if (notify) this.emit({ type: "progressChanged", state: this.state });
  }
}

export function levelForXp(xp: number): number {
  return levelProgress(xp).level;
}

function normalizeReward(reward: Reward, validateItems = true): Reward {
  const items = [...new Set(reward.items)].filter((id) => {
    if (validateItems && !avatarItemById(id)) throw new Error(`Награда содержит неизвестный предмет: ${id}`);
    return !validateItems || !!avatarItemById(id);
  });
  return {
    xp: clampInt(reward.xp, 0, 1_000_000),
    cash: clampInt(reward.cash, 0, 1_000_000),
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
    inventory: { ...(state.inventory ?? {}) },
    equipped: { ...(state.equipped ?? {}) },
    completedQuests: Object.fromEntries(Object.entries(state.completedQuests ?? {}).map(([id, entry]) => [id, { ...entry, reward: normalizeReward(entry.reward, false) }])),
    claimed: Object.fromEntries(Object.entries(state.claimed ?? {}).map(([id, entry]) => [id, { ...entry, reward: normalizeReward(entry.reward, false) }])), // в сохранениях до районов поля нет
    shards: clampInt(state.shards ?? 0, 0, Number.MAX_SAFE_INTEGER),
    pity: { ...(state.pity ?? {}) },
  };
}

function clampInt(value: number, min: number, max: number) {
  const n = Number.isFinite(value) ? Math.round(value) : min;
  return Math.max(min, Math.min(max, n));
}
