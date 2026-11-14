import { test } from "node:test";
import assert from "node:assert/strict";
import { EMPTY_PROGRESS, ProgressManager, type ProgressSave } from "./progress.ts";
import type { ProgressEvent } from "./types.ts";

const cells = (start: number, count: number) => Array.from({ length: count }, (_, i) => `240000:${start + i}`);

test("каждая новая ячейка сразу даёт XP и обновляет HUD, прогресс сохраняется после перезапуска", () => {
  let saved: ProgressSave = EMPTY_PROGRESS;
  const events: ProgressEvent[] = [];
  let manager = new ProgressManager({ save: state => { saved = state; }, emit: event => events.push(event) });
  assert.equal(manager.recordExploration(cells(0, 24), true), 24);
  assert.equal(manager.state.xp, 24);
  assert.equal(events.length, 1);
  manager = new ProgressManager({ initial: saved, save: state => { saved = state; }, emit: event => events.push(event) });
  assert.equal(manager.recordExploration(cells(24, 1), true), 1);
  assert.equal(manager.recordExploration(cells(25, 226), true), 226);
  assert.equal(manager.state.xp, 251);
  assert.equal(manager.state.level, 2);
  assert.equal(saved.exploration?.cells, 251);
  assert.equal(events.length, 3);
  assert.equal(events.every(event => event.type === "progressChanged"), true);
  assert.equal("exploration" in manager.state, false, "Большой журнал не отправляется в HUD");
});

test("симуляция даёт XP; повторный проход, сброс тумана и старые открытия не выдают повторный опыт", () => {
  let saved: ProgressSave = EMPTY_PROGRESS;
  let manager = new ProgressManager({ knownExplorationCells: cells(0, 25), save: state => { saved = state; } });
  assert.equal(manager.recordExploration(cells(0, 25), true), 0);
  assert.equal(manager.recordExploration(cells(25, 25), false), 25);
  assert.equal(manager.recordExploration(cells(25, 25), true), 0);
  assert.equal(manager.recordExploration(cells(50, 25), true), 25);
  assert.equal(manager.recordExploration([], true), 0); // resetFog
  manager = new ProgressManager({ initial: saved });
  assert.equal(manager.recordExploration(cells(0, 75), true), 0);
  assert.equal(manager.state.xp, 50);
  manager.reset();
  assert.equal(manager.recordExploration(cells(0, 75), true), 0);
  assert.equal(manager.state.xp, 0);
});

test("обновление старого сохранения сохраняет XP и журнал открытых ячеек", () => {
  const manager = new ProgressManager({ initial: { ...EMPTY_PROGRESS, xp: 10, exploration: { cells: 25, seen: cells(0, 30) } } });
  assert.equal(manager.recordExploration(cells(0, 30)), 0);
  assert.equal(manager.state.xp, 10);
  assert.equal(manager.recordExploration(cells(30, 1), false), 1);
  assert.equal(manager.state.xp, 11);
});
