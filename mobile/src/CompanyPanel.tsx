import React, { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Share, Text, View } from 'react-native';
import { INTERESTS, matchGroup, type Interest, type Member, type MatchOutput } from '../../src/match/matchGroup';
import type { Place } from '../../src/data/place';
import type { LatLon } from '../../src/engine/protocol';
import { Button, Card, Chip, Field, u } from './shared/ui/primitives';
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
    // Unknown climbs cannot satisfy an explicit flat-route requirement.
    const places = members.some(member => member.noClimb) ? catalog.filter(place => climbs[place.id] != null) : catalog;
    setOutput(matchGroup({ members, places, weather: { bad: badWeather || weatherBad === true }, climbOf: place => climbs[place.id] }));
    setVotes({});
  };
  const score = (id: string) => Object.values(votes[id] || {}).reduce((sum, value) => sum + value, 0);
  const winner = output?.results.slice().sort((a, b) => score(b.place.id) - score(a.place.id))[0];
  const share = async (place: Place) => {
    try { await Share.share({ message: `Встречаемся: ${place.name}\n${place.address || ''}\nОкно встречи: ${output?.window?.start || ''} — ${output?.window?.end || ''}\n${place.source}\nЦена и часы требуют проверки.` }); } catch { setError('Не удалось открыть меню отправки.'); }
  };
  if (!draftLoaded) return <Card><Text style={u.muted}>Загружаем черновик анкеты…</Text></Card>;
  return <View style={u.stack}><Text style={u.eyebrow}>ПЕРЕДАЙ ТЕЛЕФОН ПО КРУГУ</Text><Text style={u.heading}>Собрать компанию</Text>
    <Text style={u.muted}>Время — Владивосток, UTC+10. Точные координаты участников не запрашиваются.</Text><View style={u.row}><Chip label="Сегодня" active={day === 0} onPress={() => setDay(0)} /><Chip label="Завтра" active={day === 1} onPress={() => setDay(1)} /></View>
    <Field label="Имя участника" value={name} onChangeText={setName} /><View style={u.row}>{Object.entries(INTERESTS).map(([id, interest]) => <Chip key={id} label={interest.label} active={interests.includes(id as Interest)} onPress={() => setInterests(interests.includes(id as Interest) ? interests.filter(value => value !== id) : interests.length < 5 ? [...interests, id as Interest] : interests)} />)}</View>
    <Field label="Бюджет на человека, ₽" value={budget} onChangeText={setBudget} numeric /><Field label="Свободен с (ЧЧ:ММ)" value={start} onChangeText={setStart} /><Field label="Свободен до (ЧЧ:ММ)" value={end} onChangeText={setEnd} />
    <Field label="Район / ориентир отправления (необязательно)" value={fromSearch} onChangeText={value => { setFromSearch(value); setFromPlace(null); }} />
    {fromPlace ? <Text style={u.muted}>Отправление от ориентира: {fromPlace.name}</Text> : !!fromSearch.trim() && catalog.filter(place => place.name.toLowerCase().includes(fromSearch.toLowerCase())).slice(0, 4).map(place => <Chip key={place.id} label={place.name} onPress={() => setFromPlace(place)} />)}
    <Text style={u.muted}>Точный адрес не нужен. Без ориентира алгоритм использует условные 25 минут на дорогу.</Text>
    <View style={u.row}><Chip label="Спокойно" active={mood === 'calm'} onPress={() => setMood('calm')} /><Chip label="Активно" active={mood === 'active'} onPress={() => setMood('active')} /><Chip label="Без крутых подъёмов" active={noClimb} onPress={() => setNoClimb(!noClimb)} /></View>
    <Button label="Добавить участника" primary onPress={addMember} />{!!error && <Text style={u.text}>{error}</Text>}
    {members.map((member, index) => <Card key={member.name}><Text style={u.heading}>{index + 1}. {member.name}</Text><Text style={u.muted}>{member.budget} ₽ · {member.interests.map(id => INTERESTS[id].label).join(', ') || 'Любые интересы'}</Text><Button label="Удалить участника" onPress={() => { setMembers(members.filter((_, i) => i !== index)); setOutput(null); setVotes({}); setVoter(0); }} /></Card>)}
    <Text style={u.muted}>{weatherBad === null ? 'Погода неизвестна. Можно вручную выбрать помещения.' : weatherBad ? 'Погода плохая: ищем только помещения.' : 'Погода позволяет прогулки.'}</Text><Chip label="Только помещения / плохая погода" active={badWeather} onPress={() => { setBadWeather(!badWeather); setOutput(null); }} />
    {members.some(member => member.noClimb) && <Text style={u.muted}>Для «без подъёмов» нужны рассчитанные маршруты. Построй их в разделе «Места».</Text>}
    <Text style={u.muted}>Общий бюджет: до {members.length ? Math.min(...members.map(member => member.budget)) : 0} ₽. Дорога оценивается приблизительно.</Text>
    <Button label="Подобрать 3 варианта" disabled={!members.length} primary onPress={match} />
    {output && <><Text style={u.muted}>{output.window ? `Общее окно: ${new Date(output.window.start).toLocaleString('ru-RU', { timeZone: 'Asia/Vladivostok' })} — ${new Date(output.window.end).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Vladivostok' })}` : 'Нет общего окна'}</Text>{output.hints.map(hint => <Text key={hint} style={u.text}>{hint}</Text>)}<View style={u.row}>{members.map((member, index) => <Chip key={member.name} label={`Голосует ${member.name}`} active={voter === index} onPress={() => setVoter(index)} />)}</View>{output.results.map(result => <Card key={result.place.id}><Text style={u.heading}>{result.place.name}</Text><Text style={u.eyebrow}>{winner?.place.id === result.place.id ? 'ЛИДЕР · ' : ''}Голосов: {score(result.place.id)}</Text><Text style={u.text}>{result.reason}</Text><Text style={u.muted}>{result.price == null ? 'Цена неизвестна' : `${result.price} ₽ на человека`} · {result.flags.join(' · ')}</Text>{result.travel.map(travel => <Text style={u.muted} key={travel.name}>{travel.name}: ~{travel.minutes} мин в пути</Text>)}<View style={u.row}><Button label="За" onPress={() => setVotes({ ...votes, [result.place.id]: { ...votes[result.place.id], [members[voter]?.name || '']: 1 } })} /><Button label="Против" onPress={() => setVotes({ ...votes, [result.place.id]: { ...votes[result.place.id], [members[voter]?.name || '']: -1 } })} /><Button label="Маршрут" onPress={() => buildRoute(result.place, result.place.id)} /><Button label="Поделиться планом" onPress={() => void share(result.place)} /></View></Card>)}</>}
  </View>;
}
