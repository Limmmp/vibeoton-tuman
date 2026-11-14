import type { LatLon } from './geo.ts';

type LayerOrderMap = { getLayer(id: string): unknown; moveLayer(id: string, beforeId?: string): unknown };

const GEOGRAPHY_MARKERS = ['places-clusters', 'places-cluster-count', 'places', 'place-selected', 'landmark-pins', 'landmark-labels'];

/** Подложка и географические метки скрываются маской; цели задания и игроки остаются поверх. */
export function coverGeographyWithFog(map: LayerOrderMap, basemapSymbols: readonly string[]) {
  if (!map.getLayer('fog-outer')) return;
  for (const id of [...basemapSymbols, ...GEOGRAPHY_MARKERS]) {
    if (map.getLayer(id)) map.moveLayer(id, 'fog-outer');
  }
}

/** Фильтрация до кластеризации: закрытые места не раскрываются даже через счётчик кластера. */
export function revealedGeography<T extends LatLon>(items: readonly T[], revealed: (point: LatLon) => boolean): T[] {
  return items.filter(revealed);
}
