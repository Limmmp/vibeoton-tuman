import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, BackHandler, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import { useNetInfo } from '@react-native-community/netinfo';
import { useFonts } from 'expo-font';
import { WebView } from 'react-native-webview';
import type { ActiveStep, AvatarItem, Command, LatLon, ProgressState, QuestSummary, RewardResult, DistrictStat, RenderProfile, BasemapStatus } from '../src/engine/protocol';
import type { Place } from '../src/data/place';
import { distance } from '../src/engine/geo';
import { defaultMapUrl, localMapUrl, mapUrl } from './src/connection';
import { MapBridge } from './src/bridge';
import { Button, Card, Chip, Field, Bar, colors, u } from './src/ui';
import { ActiveQuest, QuestList, RewardStatus } from './src/QuestPanel';
import { PlacesPanel, RouteSummary, type RouteInfo } from './src/PlacesPanel';
import { CompanyPanel } from './src/CompanyPanel';
import { ProfilePanel } from './src/ProfilePanel';
import { Onboarding } from './src/Onboarding';
import { usePreferences } from './src/preferences';
import { catalog, filterPlaces } from './src/catalog';
import { SwipeSheet, Entrance, Notice } from './src/motion';
import { MapSurface, type MapHandlers } from './src/MapSurface';
import { Icon } from './src/icons';
import { useNavigation } from './src/useNavigation';
import { DistrictPanel } from './src/DistrictPanel';
import { StylePreview } from './src/StylePreview';
import { diagnosticQuest } from './src/diagnostic';
import { DemoPanel } from './src/DemoPanel';
import { CollectionPanel } from './src/CollectionPanel';
import landmarks from '../public/models/landmarks/manifest.json';
import { levelProgress } from '../src/progress/level';

const tabs = ['Карта', 'Компания', 'Места', 'История', 'Профиль'] as const;
type Tab = typeof tabs[number];
type Overlay = 'quests' | 'settings' | 'developer' | 'helper' | 'inbox' | 'filters' | 'districts' | 'preview' | 'demo' | 'collection' | null;
const layers = ['Задания', 'Учёба', 'Досуг', 'История', 'События'];
const origin = { lat: 43.1155, lon: 131.8855 };
const hostedMap = 'https://limmmp.github.io/vibeoton-tuman/';

function Application() {
  const insets = useSafeAreaInsets();
  const [mapControlsTop, setMapControlsTop] = useState(140);
  const network = useNetInfo();
  const mapHandlers = useRef<MapHandlers>({ message: () => {}, error: () => {}, reload: () => {} });
  const web = useRef<WebView<object>>(null);
  const bridge = useRef(new MapBridge(raw => {
    if (!web.current) throw new Error('WebView ещё не открыт');
    web.current.postMessage(raw);
  })).current;
  const { preferences, loaded, update, storageError } = usePreferences();
  const initialized = useRef(false);
  const mounted = useRef(true);
  const [address, setAddress] = useState(defaultMapUrl);
  const [url, setUrl] = useState('');
  const [generation, setGeneration] = useState(0);
  const generationRef = useRef(0);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const [error, setError] = useState('');
  const { navigation, dispatch } = useNavigation();
  const { tab, overlay, sheet, layer } = navigation.current;
  const setTab = (tab: Tab) => dispatch({ type: 'push', patch: { tab, overlay: null } });
  const setOverlay = (overlay: Overlay) => overlay === null ? dispatch({ type: 'closeOverlay' }) : dispatch({ type: 'push', patch: { overlay } });
  const setSheet = (sheet: number) => dispatch({ type: 'replace', patch: { sheet } });
  const setLayer = (layer: string) => dispatch({ type: 'replace', patch: { layer } });



  const [mode, setMode] = useState<'2d' | '3d'>('2d');
  const [position, setPosition] = useState<LatLon>(origin);
  const [listPosition, setListPosition] = useState<LatLon>(origin);
  const positionRef = useRef(position);
  const [appState, setAppState] = useState(AppState.currentState);
  const [fogEffects, setFogEffects] = useState(true);
  const [engineVersion, setEngineVersion] = useState<string | null>(null);
  const [basemap, setBasemap] = useState<BasemapStatus | null>(null);
  const [demoSpeed, setDemoSpeed] = useState(8);
  const [demoTapMode, setDemoTapMode] = useState<'walk' | 'teleport'>('walk');
  const [demoActive, setDemoActive] = useState(false);
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [districts, setDistricts] = useState<DistrictStat[]>([]);
  const [renderProfile, setRenderProfile] = useState<RenderProfile | null>(null);
  const [area, setArea] = useState(0);
  const [quests, setQuests] = useState<QuestSummary[]>([]);
  const [active, setActive] = useState<ActiveStep | null>(null);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const level = levelProgress(progress?.xp ?? 0);
  const [items, setItems] = useState<AvatarItem[]>([]);
  const [reward, setReward] = useState<RewardResult | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [failure, setFailure] = useState<{ id: string; reason: string } | null>(null);
  const [busy, setBusy] = useState(0);
  const selected = catalog.find(place => place.id === navigation.current.selectedId) || null;
  const setSelected = (place: Place | null) => dispatch({ type: 'push', patch: { selectedId: place?.id ?? null } });
  const selectPlace = useCallback((place: Place | null) => {
    if (!place) { dispatch({ type: 'back' }); return; }
    dispatch({ type: 'push', patch: { selectedId: place.id } });
    void bridge.request({ type: 'flyTo', lat: place.lat, lon: place.lon, zoom: 16 }).catch(problem => setError(problem.message));
  }, [bridge, dispatch]);
  const [search, setSearch] = useState('');
  const [placeFilters, setPlaceFilters] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteInfo | null>(null);
  const [routing, setRouting] = useState(false);
  const routePending = useRef(false);
  const [climbs, setClimbs] = useState<Record<string, number>>({});
  const climbOrigin = useRef(origin);
  const [events, setEvents] = useState<string[]>([]);
  const [toast, setToast] = useState('');
  const [weather, setWeather] = useState<{ text: string; bad: boolean | null }>({ text: 'Погода: нет данных', bad: null });
  const gpsSubscription = useRef<Location.LocationSubscription | null>(null);
  const gpsGeneration = useRef(0);
  const [gps, setGps] = useState(false);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [wantsGps, setWantsGps] = useState(false);
  const goBack = () => { if (rewardOpen) { setRewardOpen(false); return true; } return dispatch({ type: 'back' }); };
  const backRef = useRef(goBack); backRef.current = goBack;
  useEffect(() => { const listener = BackHandler.addEventListener('hardwareBackPress', () => preferences.onboarded ? backRef.current() : true); return () => listener.remove(); }, [preferences.onboarded]);
  const notify = (message: string) => { setToast(message); setEvents(previous => [message, ...previous].slice(0, 50)); };
  const send = (command: Command) => { const session = generationRef.current; void bridge.request(command).catch(problem => { if (mounted.current && session === generationRef.current) setError(problem.message); }); };
  const execute = async (command: Command): Promise<unknown> => {
    const session = generationRef.current;
    setBusy(value => value + 1); setError('');
    try {
      const result = await bridge.request(command);
      if (!mounted.current || session !== generationRef.current) return;
      if (command.type === 'listQuests' && !Array.isArray(result)) throw new Error('Карта не поддерживает каталог квестов. Обнови движок или укажи локальный сервер.');
      if (command.type === 'getProgress' && (!result || !Number.isFinite((result as ProgressState).xp))) throw new Error('Движок не вернул прогресс. Обнови карту.');
      if (command.type === 'getQuestState' && result === undefined) throw new Error('Движок не поддерживает состояние квеста. Обнови карту.');
      if (command.type === 'resetFog' || command.type === 'resetProgress') void bridge.request<DistrictStat[]>({ type: 'getDistricts' }).then(setDistricts).catch(problem => setError(problem.message));
      if (command.type === 'getDistricts' && Array.isArray(result)) setDistricts(result);
      if (command.type === 'getProgress') setProgress(result as ProgressState);
      if (command.type === 'listQuests') setQuests(result as QuestSummary[]);
      if (command.type === 'getQuestState') setActive(result as ActiveStep | null);
      if (command.type === 'answerQuiz') notify((result as { correct: boolean }).correct ? 'Верный ответ' : 'Неверно. Попробуй другой ответ.');
      if (command.type === 'startQuest' || command.type === 'startQuestById') { setReward(null); setFailure(null); }
      return result;
    } catch (problem) { if (mounted.current && session === generationRef.current) setError((problem as Error).message); }
    finally { if (mounted.current) setBusy(value => Math.max(0, value - 1)); }
  };
  const stopGps = () => { gpsGeneration.current++; gpsSubscription.current?.remove(); gpsSubscription.current = null; setGps(false); setGpsBusy(false); };
  const runDemo = async (commands: Command[]): Promise<boolean> => {
    if (!readyRef.current) { setError('Сначала подключи карту'); return false; }
    const session = generationRef.current;
    stopGps(); setBusy(value => value + 1); setError('');
    try {
      await bridge.request({ type: 'setPlayerMode', mode: 'sim' });
      for (const command of commands) {
        if (session !== generationRef.current) return false;
        await bridge.request(command);
      }
      if (session !== generationRef.current) return false;
      setDemoActive(true); return true;
    } catch (problem) { if (session === generationRef.current) setError((problem as Error).message); return false; }
    finally { if (mounted.current) setBusy(value => Math.max(0, value - 1)); }
  };
  const showDemoMap = () => dispatch({ type: 'push', patch: { tab: 'Карта', overlay: null, sheet: 0 } });
  const startGps = async () => {
    if (!readyRef.current) { setWantsGps(true); return; }
    const token = ++gpsGeneration.current; setGpsBusy(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (token !== gpsGeneration.current) return;
      if (permission.status !== 'granted') { notify('Геолокация отклонена. Доступна симуляция.'); return; }
      await bridge.request({ type: 'setPlayerMode', mode: 'external' });
      if (token !== gpsGeneration.current) return;
      const subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 5, timeInterval: 2000 }, fix => {
        if (token !== gpsGeneration.current) return;
        send({ type: 'gpsFix', lat: fix.coords.latitude, lon: fix.coords.longitude, accuracy: fix.coords.accuracy ?? undefined, heading: fix.coords.heading != null && fix.coords.heading >= 0 ? fix.coords.heading : undefined });
      });
      if (token !== gpsGeneration.current) { subscription.remove(); return; }
      gpsSubscription.current = subscription; setGps(true); setDemoActive(false); send({ type: 'follow', on: true });
    } catch (problem) { if (token === gpsGeneration.current) { send({ type: 'setPlayerMode', mode: 'sim' }); setError(`GPS недоступен: ${(problem as Error).message}`); } }
    finally { if (token === gpsGeneration.current) setGpsBusy(false); }
  };
  const askGps = () => Alert.alert('Геолокация во время прогулки', 'Координаты нужны движку карты для квестов и тумана. Фоновое отслеживание не включается. Можно остаться в симуляции.', [{ text: 'Симуляция', style: 'cancel' }, { text: 'Включить GPS', onPress: () => void startGps() }]);
  const connect = (nextAddress = address) => {
    try {
      const next = mapUrl(nextAddress); stopGps(); readyRef.current = false; setReady(false);
      bridge.disconnect('Карта переподключается'); setActive(null); setProgress(null); setQuests([]); setItems([]); setReward(null); setFailure(null);
      setRoute(null); setClimbs({}); setDistricts([]); setError(''); setUrl(next); setAddress(nextAddress); update({ mapAddress: nextAddress });
      generationRef.current++; setGeneration(generationRef.current);
    } catch { setError('Укажи полный адрес HTTP или HTTPS.'); }
  };
  const locate = (point: LatLon) => { send({ type: 'flyTo', ...point, zoom: 16 }); dispatch({ type: 'push', patch: { overlay: null, tab: 'Карта', sheet: 0 } }); };
  const teleport = async (point: LatLon) => runDemo([{ type: 'setDemoTapMode', mode: 'walk' }, { type: 'teleport', ...point }, { type: 'follow', on: true }]);
  const buildRoute = async (to: LatLon, placeId?: string) => {
    if (routePending.current) return;
    routePending.current = true; setRouting(true); setRoute(null);
    const routeStart = positionRef.current;
    const result = await execute({ type: 'route', to }) as RouteInfo | undefined;
    if (result && Number.isFinite(result.distance) && Number.isFinite(result.climb)) { setRoute(result); if (placeId && distance(routeStart, positionRef.current) <= 50) setClimbs(previous => ({ ...previous, [placeId]: result.climb })); }
    routePending.current = false; setRouting(false);
  };
  const checkIn = async (place: Place) => {
    if (!gps) { setError('Для отметки включи GPS. В симуляции доступен тест квеста.'); return; }
    // checkIn only accepts places registered by showPlaces; retain current visible categories.
    try { await bridge.request({ type: 'showPlaces', places: visiblePlaces.map(p => ({ ...p, kind: p.kind[0] })) }); } catch (problem) { setError((problem as Error).message); return; }
    const result = await execute({ type: 'checkIn', placeId: place.id }) as { ok: boolean; distance: number; radius?: number; first?: boolean } | undefined;
    if (result && !result.ok) notify(`Подойди ближе: ${result.distance} м, нужно не дальше ${result.radius ?? 60} м.`);
  };
  const stopQuest = () => Alert.alert('Бросить квест?', 'Текущий шаг будет сброшен. Полученный ранее прогресс сохранится.', [{ text: 'Продолжить', style: 'cancel' }, { text: 'Бросить', style: 'destructive', onPress: () => void execute({ type: 'stopQuest' }) }]);
  const onMessage = (raw: string) => {
    const event = bridge.receive(raw);
    if (!event) return;
    switch (event.type) {
      case 'ready':
        setDemoSpeed(event.state.player.simSpeed ?? 8); setDemoTapMode(event.state.demoTapMode ?? 'walk'); setDemoActive(false);
        setEngineVersion(event.state.engineVersion ?? null); setBasemap(event.state.basemap ?? null);
        positionRef.current = event.state.player; setListPosition(event.state.player); setFogEffects(event.state.fogEffects ?? true);
        readyRef.current = true; setReady(true); setError(''); setPosition(event.state.player); setArea(event.state.fog.km2);
        setRenderProfile(event.state.renderProfile); void execute({ type: 'getDistricts' }); setActive(event.state.quest ?? null); setProgress(event.state.progress ?? null); setMode(event.state.viewMode);
        send({ type: 'setPlayerMode', mode: 'sim' }); send({ type: 'follow', on: true });
        void execute({ type: 'listQuests' });
        void bridge.request<AvatarItem[]>({ type: 'listAvatarItems' }).then(value => { if (Array.isArray(value)) setItems(value); else setError('Обнови движок карты: каталог аватаров недоступен.'); }).catch(problem => setError(problem.message));
        // Start in 2D on every device; saved 3D is an explicit user preference.
        if (preferences.view === '3d' && !event.state.renderProfile?.mobile) { send({ type: 'setViewMode', mode: '3d' }); setMode('3d'); }
        if (!event.state.engineVersion) setError('Подключён прежний движок карты. В настройках выбери «Локальная карта», чтобы проверить исправления.');
        break;
      case 'demoChanged': setDemoSpeed(event.speed); setDemoTapMode(event.tapMode); break;
      case 'landmarkTap': setCollectionId(event.id); setOverlay('collection'); break;
      case 'basemapChanged':
        setBasemap(event.status);
        if (event.status.ready) setError(previous => previous.startsWith('Не загружаются обе подложки') ? '' : previous);
        break;
      case 'renderQualityChanged': setRenderProfile(event.profile); break;
      case 'districtProgress': setDistricts(previous => previous.map(d => d.id === event.id ? { ...d, ...event, milestone: Math.max(d.milestone, ...[0, 25, 50, 75, 90].filter(pct => pct <= event.pct)) } : d)); break;
      case 'districtMilestone': notify(event.name + ': открыто ' + event.pct + '%'); break;
      case 'checkedIn': notify(event.first ? 'Первая отметка в месте' : 'Ты уже отмечался здесь'); break;
      case 'playerMoved':
        positionRef.current = event;
        setPosition(previous => distance(previous, event) >= 5 ? event : previous);
        setListPosition(previous => distance(previous, event) >= 15 ? event : previous);
        break;
      case 'mapError': setError(event.message); break;
      case 'fogChanged': setArea(event.km2); break;
      case 'activeStep': setActive(event.active); break;
      case 'questTargetTap': setTab('Карта'); setSheet(1); notify('Цель задания: ' + (active?.step.text || event.id)); break;
      case 'placeTap': { if (event.id.startsWith('quest:')) { setOverlay('quests'); break; } const place = catalog.find(item => item.id === event.id); if (place) dispatch({ type: 'push', patch: { selectedId: place.id, tab: 'Места', sheet: 1 } }); break; }
      case 'mapLongPress': Alert.alert('Пеший маршрут', 'Построить маршрут к этой точке?', [{ text: 'Отмена', style: 'cancel' }, { text: 'Построить', onPress: () => { void buildRoute(event); setTab('Карта'); setSheet(1); } }, { text: 'Телепортироваться · демо', onPress: () => { void teleport(event).then(ok => { if (ok) showDemoMap(); }); } }]); break;
      case 'stepDone': notify('Шаг выполнен'); break;
      case 'questDone': setActive(null); notify(event.trusted ? 'Квест завершён' : 'Квест завершён в демо-режиме'); break;
      case 'rewardGranted': setReward(event.result); setProgress(event.result.state); setRewardOpen(true); break;
      case 'progressChanged': setProgress(event.state); break;
      case 'inventoryChanged': setProgress(previous => previous ? { ...previous, inventory: event.inventory, equipped: event.equipped } : previous); break;
      case 'questFailed': setActive(null); setFailure({ id: event.questId, reason: event.reason }); notify(`Квест провален: ${event.reason}`); break;
      case 'questStopped': setActive(null); notify('Квест остановлен'); break;
    }
  };
  useEffect(() => { if (loaded && !initialized.current) { initialized.current = true; const next = preferences.mapAddress || defaultMapUrl; setAddress(next); try { setUrl(mapUrl(next)); } catch { setError('Сохранён неверный адрес карты'); } } }, [loaded]);
  useEffect(() => { if (ready && wantsGps) { setWantsGps(false); void startGps(); } }, [ready, wantsGps]);
  useEffect(() => {
    if (!ready) return;
    let live = true;
    void bridge.request({ type: 'setMapControlsInset', top: mapControlsTop }).catch(problem => { if (live) setError(problem.message); });
    return () => { live = false; };
  }, [bridge, ready, mapControlsTop, generation]);
  useEffect(() => { if (!loaded || ready || !url) return; const timer = setTimeout(() => setError('Карта не ответила. Проверь сеть и адрес в настройках.'), 25000); return () => clearTimeout(timer); }, [loaded, ready, url, generation]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; gpsGeneration.current++; gpsSubscription.current?.remove(); bridge.disconnect(); }; }, []);
  useEffect(() => { const subscription = AppState.addEventListener('change', setAppState); return () => subscription.remove(); }, []);
  useEffect(() => {
    if (ready) send({ type: 'setRenderActivity', active: appState === 'active' && preferences.onboarded && !overlay && !rewardOpen });
  }, [ready, generation, appState, preferences.onboarded, overlay, rewardOpen]);
  useEffect(() => { if (distance(climbOrigin.current, position) > 50) { climbOrigin.current = position; setClimbs({}); } }, [position]);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    // Only the public city centre is sent to the weather service, never player coordinates.
    fetch('https://api.open-meteo.com/v1/forecast?latitude=43.1155&longitude=131.8855&current=temperature_2m,weather_code,wind_speed_10m', { signal: controller.signal }).then(response => { if (!response.ok) throw new Error('weather'); return response.json(); }).then(data => {
      const current = data.current;
      if (!current || !Number.isFinite(current.temperature_2m)) return;
      if (mounted.current) setWeather({ text: `${Math.round(current.temperature_2m)}° · Open-Meteo`, bad: current.weather_code >= 45 || current.wind_speed_10m >= 35 });
    }).catch(() => {}).finally(() => clearTimeout(timer));
    return () => { clearTimeout(timer); controller.abort(); };
  }, []);
  const filtered = useMemo(() => filterPlaces(catalog, search, placeFilters, listPosition, climbs), [search, placeFilters, listPosition, climbs]);
  const markerPlaces = useMemo(() => layer === 'Учёба' ? filtered.filter(place => place.kind.includes('study') || place.kind.includes('creative')) : layer === 'История' ? filtered.filter(place => place.kind.includes('history') || place.kind.includes('culture')) : layer === 'Досуг' ? filtered.filter(place => place.kind.some(kind => ['leisure', 'food', 'outdoor'].includes(kind))) : [], [filtered, layer]);
  const visiblePlaces = useMemo(() => [...markerPlaces.slice(0, 15).filter(place => place.id !== selected?.id), ...(selected ? [selected] : [])].slice(-15), [markerPlaces, selected]);
  const mapMarkers = useMemo(() => [...visiblePlaces.map(place => ({ id: place.id, lat: place.lat, lon: place.lon, name: place.name, kind: place.kind[0] })), ...(layer === 'Задания' ? quests.slice().sort((a, b) => distance(listPosition, a.start) - distance(listPosition, b.start)).slice(0, 5).map(quest => ({ ...quest.start, id: 'quest:' + quest.id, name: quest.title, kind: 'quest' })) : [])], [visiblePlaces, layer, quests, listPosition]);
  const markerKey = mapMarkers.map(place => place.id).sort().join('|');
  useEffect(() => { if (ready) send({ type: 'showPlaces', places: mapMarkers }); }, [ready, markerKey]);
  const changeTab = (next: Tab) => { if (next === tab) return; dispatch({ type: 'push', patch: { tab: next, overlay: null, selectedId: null, sheet: next === 'Карта' || next === 'Профиль' ? 0 : 2, layer: next === 'Места' ? 'Учёба' : next === 'История' ? 'История' : layer } }); };
  const switchView = () => { const next = mode === '2d' ? '3d' : '2d'; void bridge.request({ type: 'setViewMode', mode: next }).then(() => { setMode(next); update({ view: next }); }).catch(problem => setError(problem.message)); };
  const testQuest = () => {
    const place = catalog.find(item => item.id === 'osm-w27532893') || catalog[0];
    const point = { id: place.id, lat: place.lat, lon: place.lon, name: place.name };
    const quest = diagnosticQuest(point, place.source);
    stopGps(); void execute({ type: 'setPlayerMode', mode: 'sim' }).then(() => execute({ type: 'startQuest', quest }));
  };
  const questContent = (developer = false) => <View style={u.stack}>
    <QuestList quests={quests} completed={Object.keys(progress?.completedQuests || {})} active={active} execute={execute} locate={locate} busy={!ready || busy > 0} />
    <Button label="Обновить список квестов" disabled={!ready} onPress={() => void execute({ type: 'listQuests' })} />
    {active ? <><ActiveQuest active={active} execute={execute} developer={developer} teleport={point => void teleport(point)} locate={locate} busy={busy > 0} /><Button label="Сдаться" onPress={stopQuest} /></> : <Text style={u.muted}>Активного шага нет.</Text>}
    {failure && <Card><Text style={u.text}>Задание провалено: {failure.reason}</Text><Button label="Попробовать снова" disabled={!ready || busy > 0} onPress={() => void execute({ type: 'startQuestById', questId: failure.id })} /></Card>}
  </View>;
  const panelContent = () => {
    if (tab === 'Места') return <PlacesPanel places={filtered} selected={selected} select={selectPlace} position={selected ? position : listPosition} scrollEnabled={sheet !== 0} search={search} setSearch={setSearch} selectedFilters={placeFilters} setFilters={setPlaceFilters} route={route} checkIn={place => void checkIn(place)} buildRoute={(point, id) => void buildRoute(point, id)} routing={routing || !ready} collapse={() => setSheet(0)} />;
    if (tab === 'Компания') return <CompanyPanel initialInterests={preferences.interests} members={preferences.members} setMembers={members => update({ members })} buildRoute={(point, id) => { void buildRoute(point, id); changeTab('Карта'); }} climbs={climbs} weatherBad={weather.bad} />;
    if (tab === 'Профиль') return <ProfilePanel progress={progress} items={items} area={area} execute={execute} districts={() => setOverlay('districts')} collection={() => { setCollectionId(undefined); setOverlay('collection'); }} settings={() => setOverlay('settings')} developer={() => setOverlay('developer')} busy={!ready || busy > 0} />;
    if (tab === 'История') return <View style={u.stack}><Text style={u.heading}>История города</Text><Card><Text style={u.text}>«Золотой туман» готовится</Text><Text style={u.muted}>Маршрут, озвучка и факты с источниками ещё не добавлены в каталог. Технический квест доступен в заданиях.</Text><Button label="Открыть задания" onPress={() => setOverlay('quests')} /></Card><Text style={u.muted}>Исторические места из каталога — на карте. Их данные требуют проверки.</Text>{markerPlaces.slice(0, 10).map(place => <Card key={place.id}><Text style={u.heading}>{place.name}</Text><Button label="Карточка места и источник" onPress={() => { dispatch({ type: 'push', patch: { selectedId: place.id, tab: 'Места', layer: 'История', sheet: 2, overlay: null } }); }} /></Card>)}</View>;
    return <View style={u.stack}><Text style={u.eyebrow}>ТВОЯ ЭКСПЕДИЦИЯ</Text>{active ? <ActiveQuest active={active} execute={execute} teleport={point => void teleport(point)} locate={locate} busy={busy > 0} /> : <Card><Text style={u.heading}>Адмирал: пойдём знакомиться с городом</Text><Text style={u.muted}>{gps ? 'Иди к цели задания, туман будет открываться по GPS.' : 'Симуляция: нажми на карту, чтобы идти. Награды в этом режиме не выдаются.'}</Text><Button label="Задания" primary onPress={() => setOverlay('quests')} /></Card>}{failure && <Button label="Квест провален: открыть задания" onPress={() => setOverlay('quests')} />}{route && <><RouteSummary route={route} /><Button label="Убрать маршрут" onPress={() => { send({ type: 'clearRoute' }); setRoute(null); }} /></>}<Button label="Помощник Адмирал" onPress={() => setOverlay('helper')} /></View>;
  };
  const overlayContent = () => {
    if (overlay === 'demo') return <DemoPanel position={positionRef.current} speed={demoSpeed} tapMode={demoTapMode} busy={!ready || busy > 0} teleport={point => { void teleport(point).then(ok => { if (ok) showDemoMap(); }); }} setSpeed={value => { void runDemo([{ type: 'setSimSpeed', multiplier: value }, { type: 'setDemoTapMode', mode: 'walk' }]); }} setTapMode={value => { void runDemo([{ type: 'setDemoTapMode', mode: value }, { type: 'follow', on: true }]).then(ok => { if (ok) showDemoMap(); }); }} close={showDemoMap} />;
    if (overlay === 'districts') return <DistrictPanel districts={districts} locate={locate} refresh={() => void execute({ type: 'getDistricts' })} />;
    if (overlay === 'preview') return <StylePreview active={active} reward={reward} area={area} level={progress?.level || 1} />;
    if (overlay === 'filters') return <View style={u.stack}><Text style={u.heading}>Слои карты</Text><Button label="Демо-перемещение" disabled={!ready} onPress={() => setOverlay('demo')} /><Button label="Коллекция достопримечательностей" onPress={() => { setCollectionId(undefined); setOverlay('collection'); }} /><Button label={mode === '2d' ? 'Включить 3D' : 'Включить 2D'} disabled={!ready} onPress={switchView} /><Button label="Где я" disabled={!ready} onPress={() => send({ type: 'follow', on: true })} /><View style={u.row}>{layers.map(value => <Chip key={value} label={value} active={layer === value} onPress={() => { setLayer(value); setOverlay(value === 'Задания' ? 'quests' : null); if (value === 'События') notify('Каталог событий пока не подключён.'); }} />)}</View><Button label="Уведомления" onPress={() => setOverlay('inbox')} /><Button label="Помощник Адмирал" onPress={() => setOverlay('helper')} /><Button label="Настройки" onPress={() => setOverlay('settings')} /><Text style={u.muted}>{weather.text}</Text></View>;
    if (overlay === 'quests') return questContent();
    if (overlay === 'developer') return <View style={u.stack}><Text style={u.eyebrow}>ПАНЕЛЬ РАЗРАБОТЧИКА</Text><Text style={u.muted}>{ready ? 'Мост подключён' : 'Нет подключения'} · {gps ? 'GPS' : 'Симуляция'} · {position.lat.toFixed(5)}, {position.lon.toFixed(5)}</Text><Button label="Короткий тест: аудио → quiz → осмотр" primary disabled={!ready || !!active || busy > 0} onPress={testQuest} />{questContent(true)}<RewardStatus result={reward} /><Button label="Обновить активный шаг" disabled={!ready} onPress={() => void execute({ type: 'getQuestState' })} /><Text style={u.heading}>Последние события</Text>{events.slice(0, 12).map((event, index) => <Text key={index} style={u.muted}>{event}</Text>)}</View>;
    if (overlay === 'settings') return <View style={u.stack}><Field label="Адрес движка карты" value={address} onChangeText={setAddress} /><Button label="Подключить" primary onPress={() => connect()} /><Button label="Опубликованная карта" onPress={() => connect(hostedMap)} /><Button label="Локальная карта" onPress={() => connect(localMapUrl)} /><Text style={u.muted}>Движок: {engineVersion || 'прежняя версия'} · Подложка: {basemap ? `${basemap.provider === 'vector' ? 'векторная' : 'резервная'}${basemap.ready ? '' : ' · загрузка'}` : 'нет диагностики'}</Text><Text style={u.muted}>Для локального сервера нужны общая Wi-Fi сеть и адрес компьютера. При смене адреса прогресс WebView может отличаться.</Text><Button label={gpsBusy ? 'Подключение GPS…' : gps ? 'Выключить GPS' : 'Включить GPS'} disabled={!ready || gpsBusy} onPress={() => { if (gps) { stopGps(); send({ type: 'setPlayerMode', mode: 'sim' }); } else askGps(); }} /><Button label={`Переключить ${mode === '2d' ? 'в 3D' : 'в 2D'}`} disabled={!ready} onPress={switchView} /><Button label="Сбросить туман" disabled={!ready} onPress={() => Alert.alert('Сбросить туман?', 'Открытые ячейки карты будут удалены.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Сбросить', style: 'destructive', onPress: () => void execute({ type: 'resetFog' }) }])} /><Button label="Сбросить награды и прогресс" disabled={!ready} onPress={() => Alert.alert('Сбросить прогресс?', 'Опыт, монеты, инвентарь и завершённые квесты будут удалены.', [{ text: 'Отмена', style: 'cancel' }, { text: 'Сбросить', style: 'destructive', onPress: () => void execute({ type: 'resetProgress' }) }])} /><Button label="Повторить онбординг" onPress={() => { update({ onboarded: false }); setOverlay(null); }} /><Button label={`Анимация тумана: ${fogEffects ? 'включена' : 'выключена'}`} disabled={!ready} onPress={() => { void bridge.request({ type: 'setFogEffects', enabled: !fogEffects }).then(() => setFogEffects(!fogEffects)).catch(problem => setError(problem.message)); }} /><Text style={u.heading}>Качество карты: {renderProfile?.quality || 'авто'}</Text><View style={u.row}>{(['low', 'balanced', 'high'] as const).map(quality => <Chip key={quality} label={({ low: 'Экономно', balanced: 'Баланс', high: 'Высокое' })[quality]} active={renderProfile?.quality === quality} onPress={() => void execute({ type: 'setRenderQuality', quality })} />)}</View><Text style={u.muted}>Качество применяется сразу. Экономный режим отключает рельеф, отмывку и объёмные дома.</Text><Text style={u.muted}>Видимость: скрыт. Социальный сервер и фоновый GPS не подключены.</Text><Text style={u.muted}>Карта: OpenFreeMap · © участники OpenStreetMap · Mapzen/Terrarium. Погода: Open-Meteo. Интернет требуется для тайлов и маршрутов.</Text><Button label="Сравнить стили и темы" onPress={() => setOverlay('preview')} /><Button label="Для разработчиков" onPress={() => setOverlay('developer')} /></View>;
    if (overlay === 'inbox') return <View style={u.stack}><Text style={u.heading}>События этой сессии</Text>{!events.length && <Text style={u.muted}>Пока тихо. Начни первое задание.</Text>}{events.map((event, index) => <Card key={index}><Text style={u.text}>{event}</Text></Card>)}</View>;
    const checklist = preferences.role === 'Первокурсник' ? ['Найти место для учёбы', 'Познакомиться с районом', 'Собрать компанию'] : preferences.role === 'Турист' ? ['Найти смотровую', 'Открыть историческое место', 'Пройти первый квест'] : ['Исследовать свой район', 'Найти место для отдыха', 'Пройти первый квест'];
    return <View style={u.stack}><Text style={u.heading}>Адмирал · первая неделя</Text><Text style={u.muted}>Личный демо-чек-лист для роли «{preferences.role}». Отметки сохраняются на телефоне.</Text>{checklist.map(task => <Card key={task}><Chip label={`${preferences.checklist.includes(task) ? '✓ ' : '○ '}${task}`} active={preferences.checklist.includes(task)} onPress={() => update({ checklist: preferences.checklist.includes(task) ? preferences.checklist.filter(value => value !== task) : [...preferences.checklist, task] })} /><Button label="Показать подходящие места" onPress={() => { dispatch({ type: 'push', patch: { overlay: null, selectedId: null, tab: 'Места', layer: 'Учёба', sheet: 2 } }); }} /></Card>)}<Text style={u.muted}>Чат Адмирала появится после подключения серверного прокси. Сейчас доступны каталог и задания.</Text></View>;
  };
  mapHandlers.current = { message: onMessage, reload: () => connect(), error: text => { readyRef.current = false; setReady(false); stopGps(); bridge.disconnect(); setError(text); } };
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.root}>
    <StatusBar style="light" />
    <View style={s.map}>{Platform.OS !== 'web' && !!url && <MapSurface uri={url} generation={generation} web={web} handlers={mapHandlers} />}</View>
    <View pointerEvents="box-none" style={s.foreground}>
      <View pointerEvents="box-none" onLayout={event => setMapControlsTop(Math.ceil(event.nativeEvent.layout.height + insets.top + 8))}>
      <View style={s.hud}><Button label="‹" disabled={!navigation.history.length && sheet === 0} onPress={goBack} /><View style={{ flex: 1, gap: 5 }}><Text style={u.text}>Ур. {level.level} · {area.toFixed(4)} км²</Text><Bar value={level.fraction} /><Text style={u.muted}>{progress ? `${level.earned} / ${level.required} опыта` : 'Загрузка опыта…'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Меню и фильтры" onPress={() => setOverlay('filters')} style={{ padding: 12 }}><Icon name="menu" /></Pressable></View>
      {demoActive && <View style={{ marginHorizontal: 10, padding: 8, backgroundColor: '#353126', borderRadius: 12 }}><Text style={u.muted}>Демо · {demoTapMode === 'teleport' ? 'нажатие телепортирует' : 'нажатие задаёт путь'} · ×{demoSpeed}</Text><Button label="Настроить перемещение" onPress={() => setOverlay('demo')} /></View>}
      {network.isConnected === false && <View style={s.error}><Text style={u.text}>Нет сети. Новые тайлы, аудио и маршруты могут быть недоступны.</Text></View>}
      {(!!error || !!storageError) && <View style={s.error}><Text style={u.text}>{error || storageError}</Text><View style={u.row}><Button label="Настройки" onPress={() => setOverlay('settings')} /><Button label="Закрыть" onPress={() => setError('')} /></View></View>}
      <Notice text={toast} onPress={() => setOverlay('inbox')} />
      </View>
      <View pointerEvents="box-none" style={{ flex: 1 }}><SwipeSheet level={sheet} onLevel={setSheet} title={tab} scroll={tab !== 'Места' || !!selected}>{panelContent()}</SwipeSheet></View>
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: colors.bg }}><Button label="Куда пойдём?" onPress={() => changeTab('Места')} /><View style={s.nav}>{tabs.map(value => <Pressable key={value} accessibilityRole="tab" accessibilityLabel={value} accessibilityState={{ selected: tab === value }} onPress={() => changeTab(value)} style={s.navItem}><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[s.navText, tab === value && { color: colors.amber }]}>{value}</Text></Pressable>)}</View></SafeAreaView>
    </View>
    <Modal visible={preferences.onboarded && (!!overlay || rewardOpen)} animationType="slide" onRequestClose={() => { goBack(); }}>
      {rewardOpen ? <SafeAreaView style={[s.root, { justifyContent: 'center', padding: 24, gap: 20 }]}>
        <Text style={u.eyebrow}>{reward?.source === 'checkin' ? 'ОТМЕТКА В МЕСТЕ' : reward?.source === 'district' ? 'ВЕХА РАЙОНА' : 'ЭКСПЕДИЦИЯ ЗАВЕРШЕНА'}</Text><Text style={u.title}>{reward?.granted ? 'Город стал ближе' : 'Тест пройден'}</Text>
        <RewardStatus result={reward} /><Button label="Продолжить" primary onPress={() => setRewardOpen(false)} />
      </SafeAreaView> : <SafeAreaView style={s.root}>
        <View style={s.modalHeader}><Button label="Назад" onPress={goBack} /><Text style={[u.heading, { flex: 1, marginHorizontal: 8, fontSize: 17 }]}>{({ demo: 'Демо-перемещение', collection: 'Коллекция', districts: 'Районы', preview: 'Сравнение стилей', filters: 'Меню и слои', quests: 'Задания', developer: 'Для разработчиков', settings: 'Настройки', helper: 'Помощник', inbox: 'Уведомления' })[overlay || 'quests']}</Text><Button label="Закрыть" onPress={() => setOverlay(null)} /></View>
        {!!error && <View style={s.error}><Text style={u.text}>{error}</Text><Button label="Скрыть ошибку" onPress={() => setError('')} /></View>}
        {overlay === 'collection' ? <CollectionPanel address={url || address} model={collectionId} locate={id => { const item = landmarks.find(value => value.id === id); if (item) locate(item); }} /> : <ScrollView automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 18, gap: 16 }}><Entrance key={overlay || 'reward'}>{overlayContent()}</Entrance></ScrollView>}
      </SafeAreaView>}
    </Modal>
    <Modal visible={loaded && !preferences.onboarded} animationType="fade" onRequestClose={() => {}}><SafeAreaView style={s.root}><Onboarding finish={(role, interests, useGps) => { update({ onboarded: true, role, interests }); if (useGps) { setWantsGps(true); } notify('Адмирал: первый квест ждёт в заданиях.'); }} /></SafeAreaView></Modal>
  </SafeAreaView>;
}
export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular: require('@expo-google-fonts/manrope/400Regular/Manrope_400Regular.ttf'),
    Manrope_600SemiBold: require('@expo-google-fonts/manrope/600SemiBold/Manrope_600SemiBold.ttf'),
    RussoOne_400Regular: require('@expo-google-fonts/russo-one/400Regular/RussoOne_400Regular.ttf'),
  });
  return <SafeAreaProvider>{fontsLoaded || fontError ? <Application /> : <SafeAreaView style={s.root}><Text style={{ color: colors.text, padding: 24 }}>Туман Владивостока</Text></SafeAreaView>}</SafeAreaProvider>;
}
const s = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg }, map: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: colors.bg }, foreground: { flex: 1 }, hud: { margin: 10, padding: 12, gap: 8, backgroundColor: '#0F1720F0', borderRadius: 16, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center' }, sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: colors.line }, handle: { padding: 10, alignItems: 'center', gap: 6, minHeight: 54 }, grip: { width: 36, height: 4, backgroundColor: colors.muted, borderRadius: 3 }, nav: { flexDirection: 'row', backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.line }, navItem: { flex: 1, paddingVertical: 10, gap: 4, alignItems: 'center', justifyContent: 'center', minHeight: 74 }, navText: { fontSize: 12, color: colors.muted, fontWeight: '600' }, modalHeader: { padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line }, error: { backgroundColor: '#593335', padding: 12, gap: 8 }, toast: { backgroundColor: '#26433B', margin: 10, padding: 12, borderRadius: 12 } });
