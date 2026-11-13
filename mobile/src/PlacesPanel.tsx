import React, { memo, useState } from 'react';
import { FlatList, Image, Linking, Pressable, Text, View } from 'react-native';
import type { Place } from '../../src/data/place';
import type { LatLon, RouteChoice } from '../../src/engine/protocol';
import { distance } from '../../src/engine/geo';
import { Button, Card, Chip, Field, colors, u } from './ui';
import { filters, priceLabel } from './catalog';

const tagLabels: Record<string, string> = { wifi: 'Wi-Fi', sockets: 'Розетки', quiet: 'Тихо', 'noise-ok': 'Можно шуметь', 'laptop-ok': 'Можно с ноутбуком', indoor: 'В помещении', outdoor: 'На улице', view: 'Красивый вид', sea: 'У моря', coffee: 'Кофе', food: 'Еда', 'board-games': 'Настолки', music: 'Музыка', art: 'Искусство', workshop: 'Мастер-классы', sport: 'Спорт', cinema: 'Кино', wheelchair: 'Доступно для колясок' };

export type RouteInfo = { distance: number; climb: number; descent: number; minutes: number; steep?: number; maxGrade?: number; profile: { d: number; h: number }[] };
export type RouteChoiceProps = { choice?: RouteChoice | null; choose?: (which: 'short' | 'gentle') => void };

/** Короткий против пологого: на сопках крутизна важнее лишних трёх минут. */
function RouteOptions({ choice, choose }: Required<RouteChoiceProps>) {
  if (!choice?.gentle) return null;
  const option = (which: 'short' | 'gentle', label: string, r: RouteInfo) => <Chip key={which} active={choice.chosen === which} onPress={() => choose(which)} label={`${label} · ${Math.ceil(r.minutes)} мин · круто ${r.steep ?? 0} м`} />;
  const saved = (choice.short.steep ?? 0) - (choice.gentle.steep ?? 0);
  return <View style={u.stack}><View style={u.row}>{option('short', 'Короткий', choice.short)}{option('gentle', 'Пологий', choice.gentle)}</View><Text style={u.muted}>Пологий обходит {saved} м крутых участков: самое крутое место {choice.gentle.maxGrade}% вместо {choice.short.maxGrade}%.</Text></View>;
}

export const RouteSummary = memo(function RouteSummary({ route, choice = null, choose }: { route: RouteInfo } & RouteChoiceProps) {
  const profile = route.profile ?? [];
  const low = Math.min(...profile.map(point => point.h));
  const high = Math.max(...profile.map(point => point.h));
  const sampled = profile.filter((_, index) => index % Math.max(1, Math.ceil(profile.length / 45)) === 0);
  const steepText = route.steep != null ? ` · круче 12%: ${route.steep} м` : '';
  return <Card><Text style={u.heading}>{(route.distance / 1000).toFixed(2)} км · {Math.ceil(route.minutes)} мин</Text><Text style={u.muted}>Подъём {Math.round(route.climb)} м · спуск {Math.round(route.descent)} м{steepText}</Text>{choose && <RouteOptions choice={choice} choose={choose} />}{!!sampled.length && <View accessibilityLabel="Профиль высот маршрута" style={{ height: 48, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>{sampled.map((point, index) => <View key={index} style={{ flex: 1, backgroundColor: '#3FB8AF', height: 5 + 43 * (point.h - low) / Math.max(1, high - low) }} />)}</View>}<Text style={u.muted}>Высоты приблизительные, по открытым данным рельефа.</Text></Card>;
});

const PlaceCard = memo(function PlaceCard({ place, meters, select }: { place: Place; meters: number; select: (place: Place | null) => void }) {
  const price = priceLabel(place);
  return <Pressable accessibilityRole="button" accessibilityLabel={place.name} onPress={() => select(place)} style={({ pressed }) => [u.card, { gap: 4 }, pressed && u.pressed]}>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}><Text style={[u.heading, { flex: 1 }]} numberOfLines={1}>{place.name}</Text><Text style={[u.label, { color: colors.faint }]}>{meters < 1000 ? `${meters} м` : `${(meters / 1000).toFixed(1).replace('.', ',')} км`}</Text></View>
    <Text style={u.muted} numberOfLines={1}>{[price === 'Цена неизвестна' ? null : price, place.address].filter(Boolean).join(' · ') || 'Адрес уточняется'}</Text>
    {place.verified && <Text style={[u.label, { color: colors.teal }]}>Проверено</Text>}
  </Pressable>;
});

export function PlacesPanel({ places, selected, select, position, search, setSearch, selectedFilters, setFilters, route, checkIn, buildRoute, routing, collapse, scrollEnabled = true, choice, choose }: RouteChoiceProps & { places: Place[]; selected: Place | null; select: (place: Place | null) => void; position: LatLon; search: string; setSearch: (text: string) => void; selectedFilters: string[]; setFilters: (value: string[]) => void; route: RouteInfo | null; checkIn: (place: Place) => void; buildRoute: (point: LatLon, id?: string) => void; routing: boolean; collapse: () => void; scrollEnabled?: boolean }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  if (selected) return <View style={u.stack}><Button kind="quiet" label="‹ Все места" onPress={() => select(null)} style={{ alignSelf: 'flex-start' }} /><Card>
    {selected.photo ? <Image source={{ uri: selected.photo }} style={{ height: 150, borderRadius: 12 }} /> : null}
    <Text style={u.title}>{selected.name}</Text><Text style={u.text}>{priceLabel(selected)}</Text><Text style={u.muted}>{selected.address || 'Адрес не указан'} · {Math.round(distance(position, selected))} м по прямой</Text><Text style={u.muted}>{selected.hours || 'Часы работы неизвестны'}</Text><Text style={u.muted}>{selected.tags.map(tag => tagLabels[tag] || tag).join(' · ') || 'Характеристики не уточнены'}</Text><Text style={u.muted}>{selected.verified ? `Проверено ${selected.checkedAt}` : 'Не проверено человеком'}</Text>{selected.notes && <Text style={u.muted}>{selected.notes}</Text>}
    <Button label={routing ? 'Строим маршрут…' : 'Маршрут'} disabled={routing} primary onPress={() => buildRoute(selected, selected.id)} />
    <Button label="Я здесь — отметиться" disabled={routing} onPress={() => checkIn(selected)} /><Text style={u.muted}>Отметка работает по GPS в радиусе 60 м, первая даёт награду.</Text>
    <Button kind="quiet" label="Источник данных" onPress={() => { if (/^https?:\/\//.test(selected.source)) void Linking.openURL(selected.source).catch(() => {}); }} />{selected.osm && <Text style={u.muted}>© участники OpenStreetMap · ODbL</Text>}
  </Card>{route && <RouteSummary route={route} choice={choice} choose={choose} />}</View>;
  return <FlatList style={{ flex: 1 }} data={places} keyExtractor={place => place.id} scrollEnabled={scrollEnabled} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets initialNumToRender={6} maxToRenderPerBatch={6} windowSize={5} contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
    renderItem={({ item }) => <PlaceCard place={item} meters={Math.round(distance(position, item))} select={select} />}
    ListHeaderComponent={<View style={u.stack}><Text style={u.title}>Места</Text><Field label="Название или адрес" value={search} onChangeText={setSearch} /><View style={u.row}><Chip label={filtersOpen ? 'Фильтры ▴' : `Фильтры${selectedFilters.length ? ` · ${selectedFilters.length}` : ''} ▾`} active={filtersOpen || selectedFilters.length > 0} onPress={() => setFiltersOpen(!filtersOpen)} /><Chip label="Показать на карте" onPress={collapse} /></View>{filtersOpen && <View style={u.row}>{filters.map(filter => <Chip key={filter} label={filter} active={selectedFilters.includes(filter)} onPress={() => setFilters(selectedFilters.includes(filter) ? selectedFilters.filter(value => value !== filter) : [...selectedFilters, filter])} />)}</View>}
    {selectedFilters.includes('Без подъёма') && <Text style={u.muted}>Показаны только места с уже рассчитанным маршрутом и подъёмом до 40 м. Сначала построй маршрут к месту.</Text>}
    <Text style={u.label}>{places.length} {places.length % 10 === 1 && places.length % 100 !== 11 ? 'место' : [2, 3, 4].includes(places.length % 10) && ![12, 13, 14].includes(places.length % 100) ? 'места' : 'мест'}</Text>
    </View>}
    ListEmptyComponent={<Card><Text style={u.text}>Ничего не нашли. Убери фильтры или измени запрос.</Text><Button label="Сбросить поиск и фильтры" onPress={() => { setSearch(''); setFilters([]); }} /></Card>} />;
}
