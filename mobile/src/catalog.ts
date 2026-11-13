import records from '../../data/places.json';
import type { Place } from '../../src/data/place';
import type { LatLon } from '../../src/engine/protocol';
import { distance } from '../../src/engine/geo.ts';
import { openMinutes } from '../../src/match/hours.ts';

export const catalog = records as Place[];
export const filters = ['Бесплатно', 'До 300 ₽', 'Открыто сейчас', 'Wi-Fi', 'Розетки', 'Тихо', 'Рядом', 'Без подъёма'] as const;
export type PlaceFilter = typeof filters[number];
export function filterPlaces(places: Place[], search: string, selected: string[], position: LatLon, climbs: Record<string, number>, now = new Date()) {
  const query = search.trim().toLowerCase();
  const distances = new Map<Place, number>();
  const distanceTo = (place: Place) => {
    let value = distances.get(place);
    if (value == null) { value = distance(position, place); distances.set(place, value); }
    return value;
  };
  return places.filter(place => {
    if (!`${place.name} ${place.address ?? ''}`.toLowerCase().includes(query)) return false;
    return selected.every(filter => {
      switch (filter) {
        case 'Бесплатно': return place.priceLevel === 'free';
        case 'До 300 ₽': return place.priceLevel === 'free' || (place.price != null && place.price <= 300);
        case 'Открыто сейчас': return (openMinutes(place.hours, now, new Date(now.getTime() + 60000)) ?? 0) > 0;
        case 'Wi-Fi': return place.tags.includes('wifi');
        case 'Розетки': return place.tags.includes('sockets');
        case 'Тихо': return place.tags.includes('quiet');
        case 'Рядом': return distanceTo(place) <= 1500;
        case 'Без подъёма': return climbs[place.id] != null && climbs[place.id] <= 40;
        default: return true;
      }
    });
  }).sort((a, b) => distanceTo(a) - distanceTo(b));
}
export const priceLabel = (place: Place) => place.priceLevel === 'free' ? 'Бесплатно' : place.price == null ? 'Цена неизвестна' : `${place.price} ₽`;
