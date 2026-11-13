import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { INTERESTS, matchGroup, type Interest, type Member, type MatchOutput } from '../../src/match/matchGroup';
import type { Place } from '../../src/data/place';
import type { LatLon } from '../../src/engine/protocol';
import { Button, Card, Chip, Field, colors, u } from './ui';
import { catalog } from './catalog';

export function CompanyPanel({ initialInterests, members, setMembers, buildRoute, climbs, weatherBad }: { initialInterests: Interest[]; members: Member[]; setMembers: (members: Member[]) => void; buildRoute: (point: LatLon, id?: string) => void; climbs: Record<string, number>; weatherBad: boolean | null }) {
  const [name, setName] = useState('');
  const [interests, setInterests] = useState<Interest[]>(initialInterests);
  const [budget, setBudget] = useState('300');
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('22:00');
  const [day, setDay] = useState(0);
  const [noClimb, setNoClimb] = useState(false);
  const [mood, setMood] = useState<'calm' | 'active'>('calm');
  const [badWeather, setBadWeather] = useState(false);
  const [output, setOutput] = useState<MatchOutput | null>(null);
  const [error, setError] = useState('');
  const [votes, setVotes] = useState<Record<string, Record<string, number>>>({});
  const [voter, setVoter] = useState(0);
  const [fromSearch, setFromSearch] = useState('');
  const [fromPlace, setFromPlace] = useState<Place | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('tuman.companyDraft.v1').then(raw => {
      if (!mounted || !raw) return;
      const draft = JSON.parse(raw);
      if (typeof draft.name === 'string') setName(draft.name);
      if (typeof draft.budget === 'string') setBudget(draft.budget);
      if (typeof draft.start === 'string') setStart(draft.start);
      if (typeof draft.end === 'string') setEnd(draft.end);
      if (Array.isArray(draft.interests)) setInterests(draft.interests.filter((id: string) => id in INTERESTS));
      setNoClimb(draft.noClimb === true);
      if (draft.day === 1) setDay(1);
      if (draft.mood === 'active') setMood('active');
      setBadWeather(draft.badWeather === true);
      if (typeof draft.fromSearch === 'string') setFromSearch(draft.fromSearch);
      setFromPlace(catalog.find(place => place.id === draft.fromPlaceId) || null);
    }).catch(() => { if (mounted) setError('Не удалось прочитать черновик анкеты.'); }).finally(() => { if (mounted) setDraftLoaded(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!draftLoaded) return;
    const timer = setTimeout(() => { AsyncStorage.setItem('tuman.companyDraft.v1', JSON.stringify({ name, interests, budget, start, end, noClimb, day, mood, badWeather, fromSearch, fromPlaceId: fromPlace?.id })).catch(() => setError('Не удалось сохранить черновик анкеты.')); }, 250);
    return () => clearTimeout(timer);
  }, [draftLoaded, name, interests, budget, start, end, noClimb, day, mood, badWeather, fromSearch, fromPlace]);
  useEffect(() => { setOutput(null); }, [weatherBad]);
  const addMember = () => {
    const money = Number(budget);
    if (!name.trim() || !Number.isFinite(money) || money < 0 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)) { setError('Укажи имя, бюджет от 0 и время в формате ЧЧ:ММ.'); return; }
    if (members.some(member => member.name === name.trim())) { setError('Имена участников должны различаться.'); return; }
    const local = new Date(Date.now() + 10 * 3600000 + day * 86400000).toISOString().slice(0, 10);
    const window = { start: new Date(`${local}T${start}:00+10:00`).toISOString(), end: new Date(`${local}T${end}:00+10:00`).toISOString() };
    if (window.end <= window.start) { setError('Конец окна должен быть позже начала в тот же день.'); return; }
    setMembers([...members, { name: name.trim(), interests, budget: money, window, noClimb, mood, ...(fromPlace ? { from: { lat: fromPlace.lat, lon: fromPlace.lon } } : {}) }]);
    setName(''); setFromPlace(null); setFromSearch(''); setOutput(null); setVotes({}); setError('');
  };
  const match = () => {
    // Неизвестный подъём не отсекаем: к выбранному месту строится пологий маршрут в обход крутых участков.
    setOutput(matchGroup({ members, places: catalog, weather: { bad: badWeather || weatherBad === true }, climbOf: place => climbs[place.id] }));
    setVotes({});
  };
  const score = (id: string) => Object.values(votes[id] || {}).reduce((sum, value) => sum + value, 0);
  const winner = output?.results.slice().sort((a, b) => score(b.place.id) - score(a.place.id))[0];
  const share = async (place: Place) => {
    try { await Share.share({ message: `Встречаемся: ${place.name}\n${place.address || ''}\nОкно встречи: ${output?.window?.start || ''} — ${output?.window?.end || ''}\n${place.source}\nЦена и часы требуют проверки.` }); } catch { setError('Не удалось открыть меню отправки.'); }
  };
  if (!draftLoaded) return <Card><Text style={u.muted}>Загружаем черновик…</Text></Card>;
  const minBudget = members.length ? Math.min(...members.map(member => member.budget)) : 0;
  const flat = members.some(member => member.noClimb);
  const weatherText = weatherBad === null ? 'Погода неизвестна' : weatherBad ? 'На улице непогода — только помещения' : 'Погода для прогулок';
  return <View style={{ gap: 20 }}>
    <View style={{ gap: 6 }}><Text style={u.eyebrow}>КУДА ПОЙДЁМ</Text><Text style={u.title}>Одно место{'\n'}на всю компанию</Text><Text style={u.muted}>Передайте телефон по кругу: каждый отмечает свой бюджет, время и что любит. Подберём то, что подойдёт всем.</Text></View>

    {members.length > 0 && <View style={{ gap: 8 }}>
      <Text style={u.label}>В компании {members.length}</Text>
      {members.map((member, index) => <View key={member.name} style={c.member}>
        <View style={c.avatar}><Text style={c.avatarText}>{member.name.slice(0, 1).toUpperCase()}</Text></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={u.text}>{member.name}{member.noClimb ? ' · без подъёмов' : ''}</Text><Text style={u.muted} numberOfLines={1}>{member.budget ? `до ${member.budget} ₽` : 'бесплатно'} · {member.interests.map(id => INTERESTS[id].label).join(', ') || 'всё равно'}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel={`Убрать ${member.name}`} hitSlop={10} onPress={() => { setMembers(members.filter((_, i) => i !== index)); setOutput(null); setVotes({}); setVoter(0); }} style={({ pressed }) => [c.remove, pressed && u.pressed]}><Text style={c.removeText}>×</Text></Pressable>
      </View>)}
    </View>}

    <Card>
      <Text style={u.heading}>{members.length ? 'Ещё участник' : 'Кто идёт?'}</Text>
      <Field label="Имя" value={name} onChangeText={setName} />
      <Text style={u.label}>Что любит · до пяти</Text>
      <View style={u.row}>{Object.entries(INTERESTS).map(([id, interest]) => <Chip key={id} label={interest.label} active={interests.includes(id as Interest)} onPress={() => setInterests(interests.includes(id as Interest) ? interests.filter(value => value !== id) : interests.length < 5 ? [...interests, id as Interest] : interests)} />)}</View>
      <Field label="Бюджет на человека, ₽" value={budget} onChangeText={setBudget} numeric />
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="Свободен с" value={start} onChangeText={setStart} /></View><View style={{ flex: 1 }}><Field label="до" value={end} onChangeText={setEnd} /></View></View>
      <View style={u.row}><Chip label="Спокойно" active={mood === 'calm'} onPress={() => setMood('calm')} /><Chip label="Активно" active={mood === 'active'} onPress={() => setMood('active')} /><Chip label="Без крутых подъёмов" active={noClimb} onPress={() => setNoClimb(!noClimb)} /></View>
      <Field label="Откуда поедет · необязательно" value={fromSearch} onChangeText={value => { setFromSearch(value); setFromPlace(null); }} />
      {fromPlace ? <Text style={u.muted}>Отправление: {fromPlace.name}</Text> : !!fromSearch.trim() && <View style={u.row}>{catalog.filter(place => place.name.toLowerCase().includes(fromSearch.toLowerCase())).slice(0, 4).map(place => <Chip key={place.id} label={place.name} onPress={() => setFromPlace(place)} />)}</View>}
      {!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}
      <Button label="Добавить в компанию" onPress={addMember} />
    </Card>

    <View style={{ gap: 8 }}>
      <Text style={u.label}>Когда и где</Text>
      <View style={u.row}><Chip label="Сегодня" active={day === 0} onPress={() => setDay(0)} /><Chip label="Завтра" active={day === 1} onPress={() => setDay(1)} /><Chip label="Только в помещении" active={badWeather} onPress={() => { setBadWeather(!badWeather); setOutput(null); }} /></View>
      <Text style={u.muted}>{weatherText} · время владивостокское</Text>
    </View>

    <Button label={members.length ? `Подобрать места${minBudget ? ` до ${minBudget} ₽` : ''}` : 'Сначала добавьте участника'} disabled={!members.length} primary onPress={match} />
    {flat && <Text style={u.muted}>Кто-то не хочет в сопку — к выбранному месту построим пологий маршрут в обход крутых участков.</Text>}

    {output && <View style={{ gap: 12 }}>
      <Text style={u.label}>{output.window ? `Все свободны ${new Date(output.window.start).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Vladivostok', hour: '2-digit', minute: '2-digit' })}–${new Date(output.window.end).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Vladivostok', hour: '2-digit', minute: '2-digit' })}` : 'Общего свободного окна нет'}</Text>
      {output.hints.map(hint => <Text key={hint} style={u.muted}>{hint}</Text>)}
      {members.length > 1 && <View style={u.row}><Text style={u.muted}>Голосует:</Text>{members.map((member, index) => <Chip key={member.name} label={member.name} active={voter === index} onPress={() => setVoter(index)} />)}</View>}
      {output.results.map((result, rank) => { const lead = winner?.place.id === result.place.id && score(result.place.id) > 0; const vote = votes[result.place.id]?.[members[voter]?.name || '']; return <View key={result.place.id} style={[c.result, lead && c.resultLead]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Text style={c.rank}>{rank + 1}</Text><Text style={[u.heading, { flex: 1 }]}>{result.place.name}</Text>{lead && <Text style={u.eyebrow}>ЛИДЕР</Text>}</View>
        <Text style={u.text}>{result.reason}</Text>
        <Text style={u.muted}>{result.price == null ? 'Цену уточнить' : result.price === 0 ? 'Бесплатно' : `${result.price} ₽ на человека`}{result.flags.length ? ` · ${result.flags.join(' · ')}` : ''}</Text>
        {result.travel.length > 0 && <Text style={u.muted}>{result.travel.map(travel => `${travel.name} ~${travel.minutes} мин`).join(' · ')}</Text>}
        <Button label="Маршрут" primary={rank === 0} onPress={() => buildRoute(result.place, result.place.id)} />
        <View style={u.row}>{members.length > 1 && <><Chip label={`За · ${score(result.place.id)}`} active={vote === 1} onPress={() => setVotes({ ...votes, [result.place.id]: { ...votes[result.place.id], [members[voter]?.name || '']: 1 } })} /><Chip label="Против" active={vote === -1} onPress={() => setVotes({ ...votes, [result.place.id]: { ...votes[result.place.id], [members[voter]?.name || '']: -1 } })} /></>}<Button kind="quiet" label="Поделиться" onPress={() => void share(result.place)} /></View>
      </View>; })}
    </View>}
  </View>;
}

const c = StyleSheet.create({
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.panel },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.amberSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 15 },
  remove: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  removeText: { color: colors.muted, fontSize: 18, lineHeight: 20 },
  result: { backgroundColor: colors.panel, borderRadius: 22, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  resultLead: { borderColor: 'rgba(245,184,61,0.6)', borderWidth: 1 },
  rank: { color: colors.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 22, letterSpacing: -0.4, width: 22 },
});
