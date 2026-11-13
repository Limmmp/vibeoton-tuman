import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectionUrl } from '../src/collection-url.ts';
import { initialNavigation, navigationReducer } from '../src/navigation.ts';

test('collection URL retains Pages subdirectory, model and cache version', () => {
  assert.equal(collectionUrl('https://example.com/vibeoton-tuman/?embedded=1&v=demo-collection-5', 's56'), 'https://example.com/vibeoton-tuman/collection.html?embedded=1&v=demo-collection-5&model=s56');
  assert.equal(collectionUrl('http://localhost:5173/'), 'http://localhost:5173/collection.html?embedded=1');
  assert.throws(() => collectionUrl('file:///collection.html'));
});

test('collection and demo return through the originating menu', () => {
  const menu = navigationReducer(initialNavigation, { type: 'push', patch: { overlay: 'filters' } });
  for (const overlay of ['demo', 'collection']) {
    const next = navigationReducer(menu, { type: 'push', patch: { overlay } });
    assert.deepEqual(navigationReducer(next, { type: 'back' }), menu);
  }
});
