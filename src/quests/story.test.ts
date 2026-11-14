import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QUEST_CATALOG, LANDMARK_QUEST, currentQuestSnapshot, questById } from './catalog.ts';
import { QuestRunner } from './runner.ts';
import { resolveQuest } from './schema.ts';

test('в каталоге только Миллионка и новое задание с двумя моделями', () => {
  assert.deepEqual(QUEST_CATALOG.map(q => q.id), ['gt1', 'landmarks-two']);
  for (const id of ['gt2', 'gt3', 'lh1', 'engine-demo-center']) assert.equal(questById(id), undefined);
  const millionka = questById('gt1')!;
  assert.deepEqual(millionka.steps.map(s => s.id), ['arbat', 'millionka', 'sport']);
  assert.ok(millionka.steps.every(s => s.type === 'goto' && !s.timeLimit));
});

test('новые точки совпадают с моделями наград; задание завершается после посещения обеих', () => {
  const models = JSON.parse(readFileSync(new URL('../../public/models/landmarks/manifest.json', import.meta.url), 'utf8'));
  const runner = new QuestRunner();
  runner.start(LANDMARK_QUEST, { position: { lat: 43, lon: 131 }, trusted: true });
  for (const step of LANDMARK_QUEST.steps) {
    assert.equal(step.type, 'goto');
    if (step.type !== 'goto') throw Error('Ожидался шаг посещения');
    const model = models.find((m: { id: string }) => m.id === step.poi.id);
    assert.ok(model?.model.endsWith('.glb'));
    assert.equal(step.poi.lat, model.lat);
    assert.equal(step.poi.lon, model.lon);
    assert.ok(runner.active);
    runner.updatePosition(step.poi);
  }
  assert.equal(runner.active, null);
});

test('старое сохранение Миллионки не возвращает ожидание разговора и таймер', () => {
  const quest = questById('gt1')!;
  const old = resolveQuest({ ...quest, steps: [
    ...quest.steps.slice(0, 2),
    { id: 'wait', type: 'hold', poi: quest.start, seconds: 20, text: 'Разговор' },
    { ...quest.steps[2], timeLimit: 420 },
  ] });
  const migrated = currentQuestSnapshot({ quest: old, stepIndex: 2, runtime: { elapsed: 12, holdSeconds: 12 }, trusted: true })!;
  assert.equal(migrated.quest.steps[migrated.stepIndex].id, 'sport');
  assert.deepEqual(migrated.runtime, { elapsed: 0 });
  assert.equal(currentQuestSnapshot({ ...migrated, quest: { ...old, id: 'gt2' } }), null);
});
