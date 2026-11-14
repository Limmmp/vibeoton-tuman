import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RouteArrival } from './route-arrival.ts';

const target = { lat: 43.113375, lon: 131.891218 };
test('маршрут завершается у цели один раз, но остаётся при движении вдали от неё', () => {
  const route = new RouteArrival();
  route.install(route.begin(), target);
  assert.equal(route.reached({ ...target, lat: target.lat + 0.001 }), false);
  assert.equal(route.reached({ ...target, lat: target.lat + 0.0002 }), true);
  assert.equal(route.reached(target), false);
});
test('отменённый или заменённый маршрут не возвращается после запоздавшего ответа', () => {
  const route = new RouteArrival();
  const old = route.begin();
  route.cancel();
  assert.equal(route.install(old, target), false);
  const older = route.begin(), current = route.begin();
  assert.equal(route.install(older, target), false);
  assert.equal(route.install(current, target), true);
  route.cancel();
  assert.equal(route.reached(target), false);
});
