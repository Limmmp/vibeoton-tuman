import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { WebView } from 'react-native-webview';
import type { Command, EngineEvent, LatLon } from '../src/engine/protocol';
import { defaultMapUrl, mapUrl } from './src/connection';
import { places } from './src/places';

type RouteInfo = { distance: number; climb: number; descent: number; minutes: number };
const initialPosition = { lat: 43.1155, lon: 131.8855 };

function Demo() {
  const web = useRef<WebView<object>>(null);
  const subscription = useRef<Location.LocationSubscription | null>(null);
  const gpsGeneration = useRef(0);
  const request = useRef(0);
  const pendingRoute = useRef<string | null>(null);
  const [address, setAddress] = useState(defaultMapUrl);
  const [url, setUrl] = useState(() => { try { return mapUrl(defaultMapUrl); } catch { return ''; } });
  const [generation, setGeneration] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [gps, setGps] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [position, setPosition] = useState<LatLon>(initialPosition);
  const [area, setArea] = useState(0);
  const [selected, setSelected] = useState(places[0]);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const send = (command: Command) => web.current?.postMessage(JSON.stringify(command));
  const stopGps = () => {
    gpsGeneration.current++;
    subscription.current?.remove();
    subscription.current = null;
    setGps(false);
    setGpsBusy(false);
  };
  useEffect(() => () => { gpsGeneration.current++; subscription.current?.remove(); }, []);
  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setError('Карта не ответила. Проверь адрес, сервер Vite и общую Wi-Fi сеть.'), 25000);
    return () => clearTimeout(timer);
  }, [ready, generation]);
  useEffect(() => {
    if (!routing) return;
    const timer = setTimeout(() => {
      pendingRoute.current = null;
      setRouting(false);
      setError('Маршрут не ответил за 45 секунд. Проверь интернет и повтори.');
    }, 45000);
    return () => clearTimeout(timer);
  }, [routing]);

  const connect = () => {
    try {
      const next = mapUrl(address);
      stopGps();
      pendingRoute.current = null;
      setRouting(false); setRoute(null); setError(''); setReady(false);
      setUrl(next); setGeneration(value => value + 1); setSettings(false);
    } catch { setError('Укажи полный адрес карты: http://192.168.1.10:5173'); }
  };
  const buildRoute = (to: LatLon) => {
    if (routing) return;
    const id = `route-${++request.current}`;
    pendingRoute.current = id;
    setRouting(true); setRoute(null); setError('');
    send({ type: 'route', id, to });
  };
  const onMessage = (raw: string) => {
    let event: EngineEvent;
    try { event = JSON.parse(raw); } catch { return; }
    switch (event.type) {
      case 'ready':
        stopGps(); setReady(true); setError('');
        setPosition(event.state.player); setArea(event.state.fog.km2); setViewMode(event.state.viewMode);
        send({ type: 'setPlayerMode', mode: 'sim' });
        send({ type: 'showPlaces', places });
        send({ type: 'follow', on: true });
        break;
      case 'playerMoved': setPosition(event); break;
      case 'fogChanged': setArea(event.km2); break;
      case 'placeTap': {
        const place = places.find(p => p.id === event.id);
        if (place) setSelected(place);
        break;
      }
      case 'mapLongPress': buildRoute(event); break;
      case 'result':
        if (event.id !== pendingRoute.current) break;
        pendingRoute.current = null; setRouting(false);
        if (!event.ok) { setError(event.error || 'Не удалось построить маршрут'); break; }
        const data = event.data as RouteInfo | undefined;
        if (data && ['distance', 'climb', 'descent', 'minutes'].every(key => Number.isFinite(data[key as keyof RouteInfo]))) setRoute(data);
        else setError('Карта вернула неверные данные маршрута');
        break;
    }
  };
  const toggleGps = async () => {
    if (gps) { stopGps(); send({ type: 'setPlayerMode', mode: 'sim' }); return; }
    const token = ++gpsGeneration.current;
    setGpsBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== gpsGeneration.current) return;
      if (permission.status !== 'granted') { setError('Доступ к GPS отклонён. Демопрогулка остаётся доступна.'); return; }
      send({ type: 'setPlayerMode', mode: 'external' });
      const watcher = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 },
        fix => {
          if (token !== gpsGeneration.current) return;
          send({ type: 'gpsFix', lat: fix.coords.latitude, lon: fix.coords.longitude,
            accuracy: fix.coords.accuracy ?? undefined,
            heading: fix.coords.heading != null && fix.coords.heading >= 0 ? fix.coords.heading : undefined });
        },
      );
      if (token !== gpsGeneration.current) { watcher.remove(); return; }
      subscription.current = watcher; setGps(true); setError('');
      send({ type: 'follow', on: true });
    } catch {
      if (token === gpsGeneration.current) { send({ type: 'setPlayerMode', mode: 'sim' }); setError('GPS недоступен. Проверь геолокацию телефона.'); }
    } finally { if (token === gpsGeneration.current) setGpsBusy(false); }
  };

  return <SafeAreaView style={s.root}>
    <StatusBar style="light" />
    <View style={s.header}><View><Text style={s.eyebrow}>ВЛАДИВОСТОК / EXPO DEMO</Text><Text style={s.title}>Город в тумане</Text></View>
      <Pressable accessibilityRole="button" onPress={() => setSettings(!settings)} style={s.icon}><Text style={s.text}>Адрес</Text></Pressable></View>
    <View style={s.stats}><Text style={s.accent}>Открыто {area.toFixed(4)} км²</Text><Text style={s.muted}>{ready ? (gps ? 'GPS телефона' : 'Демопрогулка') : 'Подключение…'}</Text></View>
    {settings && <View style={s.settings}><Text style={s.text}>Адрес движка карты</Text><TextInput accessibilityLabel="Адрес движка карты" style={s.input} value={address} onChangeText={setAddress} autoCapitalize="none" autoCorrect={false} keyboardType="url" /><Button label="Подключить" onPress={connect} /><Text style={s.muted}>Телефон и компьютер должны быть в одной сети.</Text></View>}
    <View style={s.map}>
      {Platform.OS === 'web' ? <View style={s.center}><Text style={s.text}>Открой приложение в Expo Go на Android или iOS.</Text><Text style={s.muted}>Браузерное демо карты: {address}</Text></View> : !!url && <WebView<object> key={generation} ref={web} source={{ uri: url }} style={s.map}
        onMessage={event => onMessage(event.nativeEvent.data)} javaScriptEnabled domStorageEnabled
        onError={event => { setReady(false); stopGps(); setError(event.nativeEvent.description); }}
        onHttpError={event => { if (event.nativeEvent.url === url) { setReady(false); stopGps(); setError(`Сервер карты: HTTP ${event.nativeEvent.statusCode}`); } }}
        onContentProcessDidTerminate={connect} />}
      {!ready && !error && Platform.OS !== 'web' && <View pointerEvents="none" style={s.loading}><ActivityIndicator color="#F5B83D" /><Text style={s.text}>Рассеиваем туман…</Text></View>}
      <View style={s.tools}><Button label={viewMode === '2d' ? '3D' : '2D'} disabled={!ready} onPress={() => { const mode = viewMode === '2d' ? '3d' : '2d'; setViewMode(mode); send({ type: 'setViewMode', mode }); }} /><Button label="Где я" disabled={!ready} onPress={() => send({ type: 'follow', on: true })} /></View>
    </View>
    {!!error && <View style={s.error}><Text style={s.text}>{error}</Text><Pressable onPress={() => setSettings(true)}><Text style={s.accent}>Проверить адрес</Text></Pressable></View>}
    <ScrollView style={s.sheet} contentContainerStyle={s.sheetContent}>
      <View style={s.row}><Text style={s.eyebrow}>ПЕРВАЯ ЭКСПЕДИЦИЯ</Text><Text style={s.muted}>{position.lat.toFixed(4)}, {position.lon.toFixed(4)}</Text></View>
      <Text style={s.cardTitle}>{selected.name}</Text><Text style={s.muted}>{selected.description}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>{places.map(place => <Pressable key={place.id} onPress={() => { setSelected(place); send({ type: 'flyTo', ...place, zoom: 15 }); }} style={[s.chip, selected.id === place.id && s.chipActive]}><Text style={s.text}>{place.name}</Text></Pressable>)}</ScrollView>
      <View style={s.row}><Button label={routing ? 'Строим…' : 'Маршрут сюда'} disabled={!ready || routing} primary onPress={() => buildRoute(selected)} /><Button label={gpsBusy ? 'Запрос GPS…' : gps ? 'Выключить GPS' : 'Включить GPS'} disabled={!ready || gpsBusy} onPress={toggleGps} /></View>
      {route && <View style={s.row}><Text style={s.accent}>{(route.distance / 1000).toFixed(2)} км · {Math.ceil(route.minutes)} мин</Text><Text style={s.muted}>Подъём {Math.round(route.climb)} м · спуск {Math.round(route.descent)} м</Text></View>}
      <View style={s.row}><Button label="В демо-точку" disabled={!ready} onPress={() => { stopGps(); send({ type: 'setPlayerMode', mode: 'sim' }); send({ type: 'teleport', ...selected }); send({ type: 'follow', on: true }); }} /><Button label="Убрать маршрут" disabled={!ready || routing} onPress={() => { send({ type: 'clearRoute' }); setRoute(null); }} /></View>
      <Text style={s.muted}>В демо нажми на карту, чтобы идти. Удерживай точку, чтобы построить маршрут. GPS работает при открытом приложении.</Text>
      <Pressable disabled={!ready} onPress={() => Alert.alert('Сбросить исследование?', 'Открытая область карты будет удалена с этого устройства.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Сбросить', style: 'destructive', onPress: () => send({ type: 'resetFog' }) }])}><Text style={s.reset}>Сбросить туман</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
function Button({ label, onPress, disabled = false, primary = false }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[s.button, primary && s.primary, disabled && s.disabled]}><Text style={[s.buttonText, primary && { color: '#101923' }]}>{label}</Text></Pressable>;
}
export default function App() { return <SafeAreaProvider><Demo /></SafeAreaProvider>; }
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#101923' }, header: { padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: '#93A5AF', fontSize: 10, letterSpacing: 1.6 }, title: { color: '#F4F6F8', fontSize: 26, fontWeight: '700', marginTop: 5 },
  text: { color: '#F4F6F8', fontSize: 13 }, muted: { color: '#A5B5BF', fontSize: 12, lineHeight: 18 }, accent: { color: '#F5B83D', fontSize: 12 },
  icon: { padding: 12, backgroundColor: '#233340', borderRadius: 12 }, stats: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 12 },
  map: { flex: 1, backgroundColor: '#162530', minHeight: 140 }, tools: { position: 'absolute', right: 12, top: 12, gap: 8 },
  loading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', gap: 12, backgroundColor: '#162530' },
  center: { flex: 1, padding: 24, justifyContent: 'center', gap: 10 }, settings: { padding: 16, gap: 10 }, input: { color: '#F4F6F8', backgroundColor: '#233340', borderRadius: 10, padding: 12 },
  sheet: { flexGrow: 0, maxHeight: '47%' }, sheetContent: { padding: 18, gap: 13 }, cardTitle: { color: '#F4F6F8', fontSize: 21, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, chip: { backgroundColor: '#233340', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#233340' }, chipActive: { borderColor: '#F5B83D' },
  button: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, backgroundColor: '#283C4B', minHeight: 44 }, buttonText: { color: '#F4F6F8', fontSize: 12, fontWeight: '600' }, primary: { backgroundColor: '#F5B83D' }, disabled: { opacity: 0.4 },
  error: { backgroundColor: '#593335', padding: 12, gap: 6 }, reset: { color: '#D98C82', fontSize: 12, paddingVertical: 8 },
});
