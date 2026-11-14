import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { lanPlugin } from '../../scripts/lan-plugin.ts';
import type { Place } from '../data/place.ts';
import { validatePreferences } from './meeting.ts';

const places: Place[] = ['museum', 'cafe', 'park'].map((id, i) => ({
  id, name: id, lat: 43.11, lon: 131.88, kind: ['leisure'], price: i === 0 ? 500 : 0,
  priceLevel: i === 0 ? 'mid' : 'free', tags: ['indoor'], hours: '24/7', photo: null,
  source: 'https://example.org', checkedAt: null, verified: false,
}));
const preferences = (budget = 500, start = '18:00', end = '22:00') => ({
  budget, start: `2026-11-14T${start}:00+10:00`, end: `2026-11-14T${end}:00+10:00`, desiredPlaceId: 'museum', interests: [],
});
function session() {
  let handler: any;
  (lanPlugin(places).configureServer as Function)({ middlewares: { use: (_path: string, fn: unknown) => { handler = fn; } } });
  return async (data: object) => {
    const req = Object.assign(Readable.from([JSON.stringify({ lat: 43.11, lon: 131.88, ...data })]), { method: 'POST' });
    let body: any;
    await handler(req, { setHeader() {}, end(raw: string) { body = JSON.parse(raw); } });
    return body;
  };
}

test('пожелания вступившего участника, бюджет, выбор места и время синхронизируются у всей группы', async () => {
  const request = session();
  const first = await request({ action: 'create', name: 'Первый', preferences: preferences(1000) });
  const second = await request({ action: 'join', code: first.group, name: 'Второй', preferences: preferences(300, '19:00') });
  assert.equal(second.meeting.members.length, 2);
  assert.equal(second.meeting.budget.perPerson, 300);
  assert.equal(second.meeting.output.window.start, '2026-11-14T09:00:00.000Z');
  assert.ok(second.meeting.output.results.every((r: any) => r.price <= 300));
  assert.equal('budget' in second.meeting.members[0], false);
  assert.equal('preferences' in second.meeting.members[0], false);
  const pooled = await request({ token: first.token, action: 'plan', mode: 'pooled', fixed: 500 });
  assert.equal(pooled.meeting.budget.perPerson, 650);
  assert.equal(pooled.meeting.output.results[0].place.id, 'museum');
  const chosen = await request({ token: first.token, action: 'choose', placeId: 'museum' });
  assert.equal(chosen.meeting.place.id, 'museum');
  assert.ok((await request({ token: second.token, action: 'schedule', meetingAt: '2026-11-14T19:00:00+10:00' })).error);
  assert.ok((await request({ token: first.token, action: 'schedule', meetingAt: '2026-11-14T18:00:00+10:00' })).error);
  await request({ token: first.token, action: 'schedule', meetingAt: '2026-11-14T19:30:00+10:00' });
  const synced = await request({ token: second.token });
  assert.equal(synced.meeting.place.id, 'museum');
  assert.equal(synced.meeting.meetingAt, '2026-11-14T09:30:00.000Z');
  assert.equal(synced.meeting.mine.budget, 300);
  assert.ok((await request({ token: second.token, action: 'plan', mode: 'fixed', fixed: 100 })).error);
  const fixed = await request({ token: first.token, action: 'plan', mode: 'fixed', fixed: 500 });
  assert.deepEqual(fixed.meeting.budget.shortfall, [second.id]);
  assert.equal(fixed.meeting.place, null);
  assert.equal(fixed.meeting.output.results.length, 0);
});

test('нет общего времени; неверные пожелания и чужой публичный ID не меняют встречу', async () => {
  const request = session();
  const owner = await request({ action: 'create', preferences: preferences() });
  const other = await request({ action: 'join', code: owner.group, preferences: preferences(500, '12:00', '13:00') });
  assert.equal(other.meeting.output.window, null);
  assert.equal(other.meeting.output.results.length, 0);
  const forged = await request({ token: owner.id, action: 'plan', mode: 'pooled', fixed: 500 });
  assert.ok(forged.error);
  const untouched = await request({ token: owner.token });
  assert.equal(untouched.meeting.mode, 'individual');
  assert.ok((await request({ token: other.token, action: 'preferences', preferences: preferences(-1) })).error);
  assert.equal((await request({ token: other.token })).meeting.mine.budget, 500);
  assert.throws(() => validatePreferences({ ...preferences(), desiredPlaceId: 'unknown' }, places));
  assert.throws(() => validatePreferences({ ...preferences(), end: 'bad date' }, places));
});

test('изменение времени участником отменяет несовместимое согласованное время', async () => {
  const request = session();
  const owner = await request({ action: 'create', preferences: preferences() });
  const other = await request({ action: 'join', code: owner.group, preferences: preferences() });
  await request({ token: owner.token, action: 'schedule', meetingAt: '2026-11-14T19:00:00+10:00' });
  const edited = await request({ token: other.token, action: 'preferences', preferences: preferences(500, '20:00') });
  assert.equal(edited.meeting.meetingAt, null);
  await request({ token: owner.token, action: 'leave' });
  const transferred = await request({ token: other.token });
  assert.equal(transferred.meeting.ownerId, other.id);
});
