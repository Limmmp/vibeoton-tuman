import { test } from "node:test";
import assert from "node:assert/strict";
import { ProgressManager, levelForXp } from "./progress.ts";
import type { ProgressEvent, Reward } from "./types.ts";
import { appearanceFromProgress, DEFAULT_AVATAR } from "./avatar.ts";

const reward: Reward = { xp: 150, cash: 100, rep: 1, items: ["admiral-cap"] };

function manager() {
  const events: ProgressEvent[] = [];
  const saves: unknown[] = [];
  return {
    events,
    saves,
    value: new ProgressManager({
      emit: (event) => events.push(event),
      save: (state) => saves.push(state),
      now: () => new Date("2026-11-13T12:00:00.000Z"),
    }),
  };
}

test("награда квеста начисляет опыт, валюту, репутацию и предмет", () => {
  const { value, events, saves } = manager();
  const result = value.grantQuestReward({ questId: "q1", title: "Квест", reward, trusted: true });

  assert.equal(result.granted, true);
  assert.deepEqual(result.newItems, ["admiral-cap"]);
  assert.equal(result.state.xp, 150);
  assert.equal(result.state.level, 2);
  assert.equal(result.state.cash, 100);
  assert.equal(result.state.rep, 1);
  assert.equal(result.state.inventory["admiral-cap"], 1);
  assert.equal(result.state.completedQuests.q1.completedAt, "2026-11-13T12:00:00.000Z");
  assert.equal(saves.length, 1);
  assert.ok(events.some((event) => event.type === "rewardGranted"));
  assert.ok(events.some((event) => event.type === "inventoryChanged"));
});

test("повторное прохождение не выдаёт награду второй раз", () => {
  const { value } = manager();
  value.grantQuestReward({ questId: "q1", title: "Квест", reward, trusted: true });
  const second = value.grantQuestReward({ questId: "q1", title: "Квест", reward, trusted: true });

  assert.equal(second.granted, false);
  assert.equal(second.reason, "already-completed");
  assert.equal(second.state.cash, 100);
  assert.equal(second.state.inventory["admiral-cap"], 1);
});

test("внешний квест не может выдать награду", () => {
  const { value } = manager();
  const result = value.grantQuestReward({ questId: "external", title: "Внешний", reward: { ...reward, cash: 999_999, items: ["unknown"] }, trusted: false });

  assert.equal(result.granted, false);
  assert.equal(result.reason, "untrusted-quest");
  assert.equal(result.state.cash, 0);
  assert.deepEqual(result.state.inventory, {});
});

test("экипировка требует полученный предмет и использует его слот", () => {
  const { value } = manager();
  assert.throws(() => value.equip("admiral-cap"), /Предмет не получен/);
  value.grantQuestReward({ questId: "q1", title: "Квест", reward, trusted: true });
  assert.equal(value.equip("admiral-cap").equipped.head, "admiral-cap");
  assert.equal(value.unequip("head").equipped.head, undefined);
});

test("внешний вид собирается из экипировки и не меняет исходный профиль", () => {
  const { value } = manager();
  value.grantQuestReward({ questId: "q1", title: "Квест", reward, trusted: true });
  const state = value.equip("admiral-cap");
  const appearance = appearanceFromProgress(state);
  assert.equal(appearance.equipped.head, "admiral-cap");
  appearance.equipped.head = undefined;
  assert.equal(value.state.equipped.head, "admiral-cap");
  assert.equal(DEFAULT_AVATAR.bodyColor, "#3FB8AF");
});

test("уровень вычисляется только из опыта", () => {
  assert.equal(levelForXp(0), 1);
  assert.equal(levelForXp(99), 1);
  assert.equal(levelForXp(100), 2);
  assert.equal(levelForXp(400), 3);
  assert.equal(levelForXp(900), 4);
});
