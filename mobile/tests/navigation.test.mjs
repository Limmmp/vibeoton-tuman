import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialNavigation, navigationReducer as reduce } from '../src/navigation.ts';

test('nested menus return developer → settings → menu → originating profile', () => {
  let state = reduce(initialNavigation, { type: 'push', patch: { tab: 'Профиль', sheet: 2 } });
  for (const overlay of ['filters', 'settings', 'developer']) state = reduce(state, { type: 'push', patch: { overlay } });
  for (const overlay of ['settings', 'filters', null]) {
    state = reduce(state, { type: 'back' });
    assert.equal(state.current.overlay, overlay);
    assert.equal(state.current.tab, 'Профиль');
    assert.equal(state.current.sheet, 2);
  }
});
test('place and map links restore the exact originating route', () => {
  const history = reduce(initialNavigation, { type: 'push', patch: { tab: 'История', layer: 'История', sheet: 2 } });
  const place = reduce(history, { type: 'push', patch: { tab: 'Места', selectedId: 'museum', sheet: 1 } });
  const map = reduce(place, { type: 'push', patch: { tab: 'Карта', sheet: 0 } });
  assert.deepEqual(reduce(map, { type: 'back' }), place);
  assert.deepEqual(reduce(place, { type: 'back' }), history);
});
test('closing a menu removes its chain without adding an invisible back step', () => {
  let state = reduce(initialNavigation, { type: 'push', patch: { tab: 'Профиль', sheet: 2 } });
  state = reduce(state, { type: 'push', patch: { overlay: 'settings' } });
  state = reduce(state, { type: 'push', patch: { overlay: 'developer' } });
  state = reduce(state, { type: 'closeOverlay' });
  assert.equal(state.current.overlay, null);
  assert.deepEqual(reduce(state, { type: 'back' }), initialNavigation);
});
test('gestures replace state, duplicate routes do not grow history, root back exits', () => {
  assert.equal(reduce(initialNavigation, { type: 'back' }), initialNavigation);
  assert.equal(reduce(initialNavigation, { type: 'push', patch: { tab: 'Карта' } }), initialNavigation);
  const expanded = reduce(initialNavigation, { type: 'replace', patch: { sheet: 2 } });
  assert.equal(expanded.history.length, 0);
  assert.equal(reduce(expanded, { type: 'back' }).current.sheet, 0);
});
