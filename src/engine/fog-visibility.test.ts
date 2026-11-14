import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coverGeographyWithFog, revealedGeography } from './fog-visibility.ts';

function layersMap(initial: string[]) {
  const order = [...initial];
  return {
    order,
    getLayer: (id: string) => order.includes(id) ? { id } : undefined,
    moveLayer(id: string, before?: string) {
      order.splice(order.indexOf(id), 1);
      order.splice(before ? order.indexOf(before) : order.length, 0, id);
    },
  };
}

test('туман перекрывает улицы, районы, POI и свои географические метки, сохраняя игровые подсказки', () => {
  const base = ['water-name', 'street-name', 'district-name', 'poi', 'road-shield'];
  const markers = ['places-clusters', 'places-cluster-count', 'places', 'place-selected', 'landmark-pins', 'landmark-labels'];
  const map = layersMap(['background', 'water-name', 'roads', 'fog-outer', 'fog', 'fog-puffs', 'hillshade', 'route', ...base.slice(1), ...markers, 'quest-targets', 'players']);
  coverGeographyWithFog(map, base);
  for (const id of [...base, ...markers]) assert.ok(map.order.indexOf(id) < map.order.indexOf('fog-outer'), id);
  for (const id of ['hillshade', 'route', 'quest-targets', 'players']) assert.ok(map.order.indexOf(id) > map.order.indexOf('fog'), id);
  assert.ok(map.order.indexOf('fog-outer') < map.order.indexOf('fog'));
  assert.ok(map.order.indexOf('fog') < map.order.indexOf('fog-puffs'));
});

test('растровая подложка и отсутствие необязательных слоёв не ломают перекрытие', () => {
  const map = layersMap(['background', 'raster', 'fog-outer', 'fog', 'places', 'quest-targets']);
  coverGeographyWithFog(map, []);
  assert.deepEqual(map.order, ['background', 'raster', 'places', 'fog-outer', 'fog', 'quest-targets']);
  const noFog = layersMap(['background', 'street-name']);
  coverGeographyWithFog(noFog, ['street-name']);
  assert.deepEqual(noFog.order, ['background', 'street-name']);
});

test('закрытые места не попадают в исходные данные кластеров, появляются при открытии и исчезают при сбросе', () => {
  const points = [{ id: 'known', lat: 43, lon: 131 }, { id: 'hidden', lat: 44, lon: 132 }];
  const open = new Set([43]);
  const shown = () => revealedGeography(points, point => open.has(point.lat));
  assert.deepEqual(shown().map(p => p.id), ['known']);
  open.add(44);
  assert.deepEqual(shown().map(p => p.id), ['known', 'hidden']);
  open.clear();
  assert.deepEqual(shown(), []);
  assert.equal(points.length, 2, 'исходный каталог сохранён');
});
