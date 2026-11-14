import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { lanPlugin } from '../../scripts/lan-plugin.ts';

test('LAN session shares positions and supports group creation, joining and leaving', async () => {
  let handler: any;
  const plugin = lanPlugin();
  (plugin.configureServer as Function)({ middlewares: { use: (_path: string, fn: unknown) => { handler = fn; } } });
  async function request(data: object) {
    const req = Readable.from([JSON.stringify({ lat: 43, lon: 131, ...data })]);
    Object.assign(req, { method: 'POST' });
    let result: any;
    const res = { statusCode: 200, setHeader() {}, end(body: string) { result = JSON.parse(body); } };
    await handler(req, res);
    return result;
  }
  const first = await request({ name: 'Первый', action: 'create' });
  assert.ok(first.group);
  const second = await request({ name: 'Второй', action: 'join', code: first.group });
  assert.equal(second.group, first.group);
  assert.equal(second.players[0].relation, 'party');
  const state = await request({ token: first.token });
  assert.equal(state.players[0].id, second.token);
  assert.equal(state.players[0].lat, 43);
  const left = await request({ token: second.token, action: 'leave' });
  assert.equal(left.group, '');
  assert.equal(left.players[0].relation, 'public');
  assert.equal((await request({ action: 'join', code: 'missing' })).error, 'Группа не найдена');
  assert.equal((await request({ lat: 200 })).error, 'Неверные координаты');
});
