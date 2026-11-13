// Слои меток на карте: какие категории мест видны. Интерфейс включает их из меню «Слои»
// командой setLayers; по умолчанию видны все (обратная совместимость со showPlaces).
// Чистая логика без карты — её можно проверить тестами.

import type { Place } from "./protocol";

export const MAP_LAYERS = ["quests", "study", "leisure", "history", "events"] as const;
export type MapLayer = (typeof MAP_LAYERS)[number];

/** Тип места (Place.kind) → слой. Неизвестный тип — в «досуг». */
const KIND_LAYER: Record<string, MapLayer> = {
  quest: "quests", collect: "quests",
  study: "study", creative: "study",
  leisure: "leisure", food: "leisure", outdoor: "leisure",
  culture: "history", history: "history",
  event: "events",
};

export function layerOfKind(kind: string | undefined): MapLayer {
  return KIND_LAYER[kind ?? ""] ?? "leisure";
}

/** Проверить и нормализовать список слоёв из команды: неизвестные — ошибка, повторы убираются. */
export function normalizeLayers(input: readonly string[]): MapLayer[] {
  const bad = input.filter((l) => !(MAP_LAYERS as readonly string[]).includes(l));
  if (bad.length) throw new Error(`Неизвестные слои: ${bad.join(", ")}`);
  return MAP_LAYERS.filter((l) => input.includes(l));
}

/** Места, видимые при выбранных слоях. */
export function visiblePlaces(places: readonly Place[], layers: readonly MapLayer[]): Place[] {
  const on = new Set(layers);
  return places.filter((p) => on.has(layerOfKind(p.kind)));
}
