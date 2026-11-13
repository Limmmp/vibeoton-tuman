import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapBridge } from '../src/bridge.ts';
import { diagnosticQuest } from '../src/diagnostic.ts';
import { QuestRunner } from '../../src/quests/runner.ts';
import { ProgressManager } from '../../src/progress/progress.ts';

test('developer quest through request/result: radius guards, quiz retry, untrusted reward', async () => {
  const point = { id: 'test', name: 'Тестовая точка', lat: 43.1155, lon: 131.8855 };
  const received = [];
  let bridge;
  const emit = event => { received.push(event); bridge.receive(JSON.stringify(event)); };
  const progress = new ProgressManager({ emit });
  const runner = new QuestRunner({ emit: event => {
    emit(event);
    if (event.type === 'questDone') progress.grantQuestReward({ questId: event.questId, title: event.questTitle, reward: event.reward, trusted: event.trusted });
  } });
  bridge = new MapBridge(raw => {
    const command = JSON.parse(raw);
    try {
      let data;
      switch (command.type) {
        case 'startQuest': data = runner.start(command.quest, { position: { lat: 43.12, lon: 131.9 }, trusted: false }); break;
        case 'teleport': runner.updatePosition(command); break;
        case 'answerQuiz': data = runner.answerQuiz(command.answer); break;
        case 'completeListen': data = runner.completeListen(); break;
        case 'confirmLook': data = runner.confirmLook(); break;
      }
      emit({ type: 'result', id: command.id, ok: true, data });
    } catch (error) { emit({ type: 'result', id: command.id, ok: false, error: error.message }); }
  });
  bridge.receive(JSON.stringify({ type: 'ready', state: { player: point, fog: {} } }));
  await bridge.request({ type: 'startQuest', quest: diagnosticQuest(point, 'https://example.com') });
  assert.equal(runner.active.runtime.audioReady, false);
  await assert.rejects(bridge.request({ type: 'completeListen' }), /подойдите/);
  await bridge.request({ type: 'teleport', ...point });
  assert.equal(runner.active.runtime.audioReady, true);
  await bridge.request({ type: 'completeListen' });
  assert.equal(runner.active.step.type, 'quiz');
  assert.deepEqual(await bridge.request({ type: 'answerQuiz', answer: 1 }), { correct: false });
  assert.equal(runner.active.step.type, 'quiz');
  await bridge.request({ type: 'answerQuiz', answer: 0 });
  assert.equal(runner.active.step.type, 'look');
  await bridge.request({ type: 'teleport', lat: 43.12, lon: 131.9 });
  await assert.rejects(bridge.request({ type: 'confirmLook' }), /подойдите/);
  await bridge.request({ type: 'teleport', ...point });
  await bridge.request({ type: 'confirmLook' });
  assert.equal(runner.active, null);
  const reward = received.find(event => event.type === 'rewardGranted').result;
  assert.equal(reward.granted, false);
  assert.equal(reward.reason, 'untrusted-quest');
  assert.equal(progress.state.xp, 0);
  assert.equal(received.filter(event => event.type === 'stepDone').length, 3);
});
