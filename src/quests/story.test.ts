import { test } from "node:test";
import assert from "node:assert/strict";
import { QUEST_CATALOG, QUEST_REQUIRES, questById } from "./catalog.ts";
import { STORY_QUESTS } from "./story.ts";
import { AVATAR_ITEMS } from "../progress/catalog.ts";

test("сюжет: идентификаторы уникальны, цепочка ссылается только на существующие квесты", () => {
  const ids = QUEST_CATALOG.map((quest) => quest.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const quest of QUEST_CATALOG) {
    for (const required of QUEST_REQUIRES[quest.id] ?? []) {
      assert.ok(questById(required), `${quest.id}: нет квеста ${required}`);
      assert.notEqual(required, quest.id);
    }
  }
});

test("сюжет: квесты открываются строго по цепочке", () => {
  assert.equal(QUEST_REQUIRES.gt1, undefined);
  for (const quest of STORY_QUESTS.slice(1)) {
    assert.equal(QUEST_REQUIRES[quest.id]?.length, 1, `${quest.id}: ожидается одно условие`);
  }
  assert.deepEqual(QUEST_REQUIRES.lh1, ["gt3"]);
});

test("сюжет: все награды существуют в каталоге аватара", () => {
  for (const quest of QUEST_CATALOG) {
    for (const item of quest.reward.items) {
      assert.ok(AVATAR_ITEMS.some((entry) => entry.id === item), `${quest.id}: нет предмета ${item}`);
    }
  }
});

test("сюжет: у каждого квеста есть текст шагов и финальная реплика", () => {
  for (const quest of STORY_QUESTS) {
    assert.ok(quest.steps.length >= 2, `${quest.id}: слишком короткий`);
    assert.ok(quest.outro.length > 0, `${quest.id}: нет финала`);
    for (const step of quest.steps) assert.ok(step.text.trim(), `${quest.id}/${step.id}: пустой текст`);
  }
});

test("финал арки закрывает главу и требует осмотр, вопрос и ожидание", () => {
  const last = STORY_QUESTS.at(-1)!;
  assert.equal(last.id, "lh1");
  assert.ok(last.steps.length >= 5);
  const types = last.steps.map((step) => step.type);
  assert.ok(types.includes("look"));
  assert.ok(types.includes("quiz"));
  assert.ok(types.includes("hold"));
  assert.match(last.outro.join(" "), /глава/i);
  assert.match(last.outro.join(" "), /Золотой туман/);
});
