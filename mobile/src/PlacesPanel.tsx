import React, { memo, useState } from 'react';
import { FlatList, Image, Linking, Text, View } from 'react-native';
import type { Place } from '../../src/data/place';
import type { LatLon } from '../../src/engine/protocol';
import { distance } from '../../src/engine/geo';
import { Button, Card, Chip, Field, u } from './ui';
import { filters, priceLabel } from './catalog';

const tagLabels: Record<string, string> = { wifi: 'Wi-Fi', sockets: 'Розетки', quiet: 'Тихо', 'noise-ok': 'Можно шуметь', 'laptop-ok': 'Можно с ноутбуком', indoor: 'В помещении', outdoor: 'На улице', view: 'Красивый вид', sea: 'У моря', coffee: 'Кофе', food: 'Еда', 'board-games': 'Настолки', music: 'Музыка', art: 'Искусство', workshop: 'Мастер-классы', sport: 'Спорт', cinema: 'Кино', wheelchair: 'Доступно для колясок' };

export type RouteInfo = { distance: number; climb: number; descent: number; minutes: number; profile: { d: number; h: number }[] };
export const RouteSummary = memo(function RouteSummary({ route }: { route: RouteInfo }) {
  const profile = route.profile ?? [];
  const low = Math.min(...profile.map(point => point.h));
  const high = Math.max(...profile.map(point => point.h));
  const sampled = profile.filter((_, index) => index % Math.max(1, Math.ceil(profile.length / 45)) === 0);
  return <Card><Text style={u.heading}>{(route.distance / 1000).toFixed(2)} км · {Math.ceil(route.minutes)} мин</Text><Text style={u.muted}>Подъём {Math.round(route.climb)} м · спуск {Math.round(route.descent)} м</Text>{!!sampled.length && <View accessibilityLabel="Профиль высот маршрута" style={{ height: 48, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>{sampled.map((point, index) => <View key={index} style={{ flex: 1, backgroundColor: '#3FB8AF', height: 5 + 43 * (point.h - low) / Math.max(1, high - low) }} />)}</View>}<Text style={u.muted}>Высоты приблизительные. На мостах возможен ложный подъём.</Text></Card>;
});

const PlaceCard = memo(function PlaceCard({ place, meters, select }: { place: Place; meters: number; select: (place: Place | null) => void }) {
  return <Card><Text style={u.heading}>{place.name}</Text><Text style={u.text}>{priceLabel(place)} · {meters} м</Text><Text style={u.muted}>{place.address || 'Адрес не указан'} · {place.verified ? 'Проверено' : 'Не проверено'}</Text><Button label="Подробнее" onPress={() => select(place)} /></Card>;
});

export function PlacesPanel({ places, selected, select, position, search, setSearch, selectedFilters, setFilters, route, checkIn, buildRoute, routing, collapse, scrollEnabled = true }: { places: Place[]; selected: Place | null; select: (place: Place | null) => void; position: LatLon; search: string; setSearch: (text: string) => void; selectedFilters: string[]; setFilters: (value: string[]) => void; route: RouteInfo | null; checkIn: (place: Place) => void; buildRoute: (point: LatLon, id?: string) => void; routing: boolean; collapse: () => void; scrollEnabled?: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (selected) return <View style={u.stack}><Button label="Назад" onPress={() => select(null)} /><Card>
    {selected.photo ? <Image source={{ uri: selected.photo }} style={{ height: 150, borderRadius: 12 }} /> : <View style={{ height: 70, justifyContent: 'center' }}><Text style={u.eyebrow}>МЕСТО НА КАРТЕ · ФОТО ПОКА НЕТ</Text></View>}
    <Text style={u.heading}>{selected.name}</Text><Text style={u.text}>{priceLabel(selected)}</Text><Text style={u.muted}>{selected.address || 'Адрес не указан'} · {Math.round(distance(position, selected))} м по прямой</Text><Text style={u.muted}>{selected.hours || 'Часы работы неизвестны'}</Text><Text style={u.muted}>{selected.tags.map(tag => tagLabels[tag] || tag).join(' · ') || 'Характеристики не уточнены'}</Text><Text style={u.muted}>{selected.verified ? `Проверено ${selected.checkedAt}` : 'Не проверено человеком'}</Text>{selected.notes && <Text style={u.muted}>{selected.notes}</Text>}
    <Button label={routing ? 'Строим маршрут…' : 'Маршрут'} disabled={routing} primary onPress={() => buildRoute(selected, selected.id)} />
    <Button label="Я здесь" disabled={routing} onPress={() => checkIn(selected)} /><Text style={u.muted}>Отметка доступна с GPS в радиусе 60 м. Первый чекин даёт награду; посещение в шаге visit засчитывается автоматически.</Text>
    <Button label="Источник данных" onPress={() => { if (/^https?:\/\//.test(selected.source)) void Linking.openURL(selected.source).catch(() => {}); }} />{selected.osm && <Text style={u.muted}>© участники OpenStreetMap · ODbL</Text>}
  </Card>{route && <RouteSummary route={route} />}</View>;
  return <FlatList style={{ flex: 1 }} data={places} keyExtractor={place => place.id} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
    renderItem={({ item }) => <PlaceCard place={item} meters={Math.round(distance(position, item))} select={select} />}
    ListHeaderComponent={<View style={u.stack}><Text style={u.heading}>Места для твоего дня</Text><Field label="Название или адрес" value={search} onChangeText={setSearch} /><Button label="☰ Фильтры" onPress={() => setFiltersOpen(!filtersOpen)} />{filtersOpen && <View style={u.row}>{filters.map(filter => <Chip key={filter} label={filter} active={selectedFilters.includes(filter)} onPress={() => setFilters(selectedFilters.includes(filter) ? selectedFilters.filter(value => value !== filter) : [...selectedFilters, filter])} />)}</View>}
    {selectedFilters.includes('Без подъёма') && <Text style={u.muted}>Показаны только места с уже рассчитанным маршрутом и подъёмом до 40 м. Сначала построй маршрут к месту.</Text>}
    <View style={u.row}><Text style={u.muted}>Найдено: {places.length}</Text><Button label="На карту" onPress={collapse} /></View>
    </View>}
    ListEmptyComponent={<Card><Text style={u.text}>Ничего не нашли. Убери фильтры или измени запрос.</Text><Button label="Сбросить поиск и фильтры" onPress={() => { setSearch(''); setFilters([]); }} /></Card>} />;
}
