import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MapBridge } from '../src/bridge.ts';

const ready = JSON.stringify({ type: 'ready', state: { player: { lat: 43, lon: 131 }, fog: { km2: 0 } } });

test('queues before ready, correlates reversed replies, never resends on duplicate ready', async () => {
  const sent = [];
  const bridge = new MapBridge(raw => sent.push(JSON.parse(raw)));
  const quests = bridge.request({ type: 'listQuests' });
  const progress = bridge.request({ type: 'getProgress' });
  assert.equal(sent.length, 0);
  bridge.receive(ready);
  bridge.receive(ready);
  assert.equal(sent.length, 2);
  bridge.receive(JSON.stringify({ type: 'result', id: sent[1].id, ok: true, data: { xp: 150 } }));
  bridge.receive(JSON.stringify({ type: 'result', id: sent[0].id, ok: true, data: ['quest'] }));
  assert.deepEqual(await quests, ['quest']);
  assert.deepEqual(await progress, { xp: 150 });
});

test('engine failures reject, unknown results and invalid messages are harmless', async () => {
  let id = '';
  const bridge = new MapBridge(raw => { id = JSON.parse(raw).id; });
  bridge.receive(ready);
  const result = bridge.request({ type: 'completeListen' });
  const rejected = assert.rejects(result, /Сначала подойдите/);
  bridge.receive(JSON.stringify({ type: 'result', id, ok: false, error: 'Сначала подойдите' }));
  await rejected;
  assert.equal(bridge.receive('null'), null);
  assert.equal(bridge.receive('{'), null);
  assert.equal(bridge.receive('{"type":"ready"}'), null);
  bridge.receive('{"type":"result","id":"unknown","ok":true}');
});

test('disconnect rejects in-flight and queued commands; timeout removes stale requests', async () => {
  const bridge = new MapBridge(() => {}, 20);
  const queued = bridge.request({ type: 'startQuestById', questId: 'test' });
  const rejected = assert.rejects(queued, /переподключение/);
  bridge.disconnect('переподключение');
  await rejected;
  await assert.rejects(bridge.request({ type: 'getState' }), /Карта не ответила/);
});
