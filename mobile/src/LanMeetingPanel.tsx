import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import type { LatLon } from '../../src/engine/protocol';
import { INTERESTS, type Interest } from '../../src/match/matchGroup';
import { validatePreferences } from '../../src/social/meeting';
import type { BudgetMode } from '../../src/social/budget';
import type { useLan } from './LanPanel';
import { catalog } from './catalog';
import { Button, Card, Chip, Field, u } from './ui';

type Lan = ReturnType<typeof useLan>;
const dateAt = (day: number) => new Date(Date.now() + 10 * 3600000 + day * 86400000).toISOString().slice(0, 10);
const toIso = (date: string, time: string) => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw Error('Время укажи в формате ЧЧ:ММ');
  return new Date(`${date}T${time}:00+10:00`).toISOString();
};
const fmt = (iso: string) => new Date(iso).toLocaleString('ru-RU', { timeZone: 'Asia/Vladivostok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const timeOf = (iso: string) => new Date(Date.parse(iso) + 10 * 3600000).toISOString().slice(11, 16);
const MODES: { id: BudgetMode; label: string }[] = [
  { id: 'individual', label: 'Каждый за себя' }, { id: 'pooled', label: 'Скидываемся' }, { id: 'fixed', label: 'Одна сумма' },
];

/** Анкета отправляется с созданием/вступлением; каждый участник редактирует только свой ответ. */
export function MeetingPreferencesForm({ lan }: { lan: Lan }) {
  const mine = lan.meeting?.mine;
  const [budget, setBudget] = useState(String(mine?.budget ?? 500));
  const [date, setDate] = useState(mine ? new Date(Date.parse(mine.start) + 10 * 3600000).toISOString().slice(0, 10) : dateAt(0));
  const [start, setStart] = useState(mine ? timeOf(mine.start) : '18:00');
  const [end, setEnd] = useState(mine ? timeOf(mine.end) : '22:00');
  const [desiredPlaceId, setDesiredPlaceId] = useState<string | null>(mine?.desiredPlaceId ?? null);
  const [search, setSearch] = useState('');
  const [interests, setInterests] = useState<Interest[]>(mine?.interests ?? []);
  const [error, setError] = useState('');
  const desired = catalog.find(p => p.id === desiredPlaceId);
  const submit = (action: string) => {
    try {
      if (!budget.trim()) throw Error('Укажи бюджет: 0 означает только бесплатные места');
      const preferences = validatePreferences({ budget: Number(budget), start: toIso(date, start), end: toIso(date, end), desiredPlaceId, interests }, catalog);
      if (action === 'join' && !lan.code.trim()) throw Error('Укажи код группы');
      setError(''); lan.act(action, { preferences });
    } catch (problem) { setError((problem as Error).message); }
  };
  const disabled = lan.pending || !lan.ready;
  return <Card>
    <Text style={u.heading}>Ваши пожелания к встрече</Text>
    <Text style={u.muted}>Время — Владивосток, UTC+10. Личный бюджет виден вам; группе показывается общий лимит.</Text>
    <Field label="Мой бюджет, ₽" numeric value={budget} onChangeText={setBudget} />
    <View style={u.row}>{['Сегодня', 'Завтра', 'Послезавтра'].map((label, i) => <Chip key={label} label={label} active={date === dateAt(i)} onPress={() => setDate(dateAt(i))} />)}</View>
    <Text style={u.muted}>Дата: {date}</Text>
    <Field label="Свободен с (ЧЧ:ММ)" value={start} onChangeText={setStart} />
    <Field label="Свободен до (ЧЧ:ММ)" value={end} onChangeText={setEnd} />
    <Field label="Желаемое место встречи" value={search} onChangeText={setSearch} placeholder="Название места из каталога" />
    {desired && <><Text style={u.text}>Хочу: {desired.name}</Text><Button kind="quiet" label="Любое подходящее место" onPress={() => setDesiredPlaceId(null)} /></>}
    {!!search.trim() && catalog.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 5).map(p => <Chip key={p.id} label={p.name} active={p.id === desiredPlaceId} onPress={() => { setDesiredPlaceId(p.id); setSearch(''); }} />)}
    <Text style={u.label}>Что хочется</Text>
    <View style={u.row}>{(Object.keys(INTERESTS) as Interest[]).map(key => <Chip key={key} label={INTERESTS[key].label} active={interests.includes(key)} onPress={() => setInterests(interests.includes(key) ? interests.filter(k => k !== key) : [...interests, key].slice(0, 5))} />)}</View>
    {!!error && <Text accessibilityLiveRegion="polite" style={u.text}>{error}</Text>}
    {lan.group ? <Button label={lan.pending ? 'Сохраняем…' : 'Сохранить пожелания'} loading={lan.pending} primary disabled={disabled} onPress={() => submit('preferences')} /> : <>
      <Button label="Создать группу с этими пожеланиями" primary disabled={disabled} onPress={() => submit('create')} />
      <Field label="Код группы" value={lan.code} onChangeText={lan.setCode} />
      <Button label="Вступить и отправить пожелания" disabled={disabled} onPress={() => submit('join')} />
    </>}
  </Card>;
}

export function LanMeetingPanel({ lan, buildRoute }: { lan: Lan; buildRoute: (point: LatLon, id?: string) => void }) {
  const m = lan.meeting!;
  const owner = m.ownerId === lan.selfId;
  const [mode, setMode] = useState(m.mode);
  const [fixed, setFixed] = useState(String(m.fixed));
  const [time, setTime] = useState(m.meetingAt ? timeOf(m.meetingAt) : '18:00');
  const [error, setError] = useState('');
  useEffect(() => { setMode(m.mode); setFixed(String(m.fixed)); }, [m.mode, m.fixed]);
  useEffect(() => { if (m.meetingAt) setTime(timeOf(m.meetingAt)); }, [m.meetingAt]);
  const disabled = lan.pending || !lan.ready;
  const savePlan = () => {
    const value = Number(fixed);
    if (!fixed.trim() || !Number.isSafeInteger(value) || value < 0 || value > 1_000_000) { setError('Укажи сумму от 0 до 1 000 000 ₽'); return; }
    setError(''); lan.act('plan', { mode, fixed: value });
  };
  const schedule = () => {
    try {
      if (!m.output.window) throw Error('Сначала согласуйте общее свободное окно');
      const date = new Date(Date.parse(m.output.window.start) + 10 * 3600000).toISOString().slice(0, 10);
      const meetingAt = toIso(date, time);
      if (meetingAt < m.output.window.start || meetingAt >= m.output.window.end) throw Error('Время должно попадать в общее свободное окно');
      setError(''); lan.act('schedule', { meetingAt });
    } catch (problem) { setError((problem as Error).message); }
  };
  return <View style={u.stack}>
    <MeetingPreferencesForm key={lan.group} lan={lan} />
    <Card><Text style={u.heading}>Общий план встречи</Text>
      <Text style={u.text}>{m.budget.label}</Text>
      <Text style={u.muted}>{m.output.window ? `Общее время: ${fmt(m.output.window.start)} — ${fmt(m.output.window.end)}` : 'Общее время пока не согласовано'}</Text>
      <Text style={u.text}>{m.meetingAt ? `Встречаемся: ${fmt(m.meetingAt)}` : 'Точное время встречи ещё не назначено'}</Text>
      {m.place ? <><Text style={u.heading}>Идём: {m.place.name}</Text><Button primary label="Маршрут к месту встречи" disabled={!lan.ready} onPress={() => buildRoute(m.place!, m.place!.id)} /></> : <Text style={u.muted}>Общее место ещё не выбрано или больше не подходит условиям группы.</Text>}
      {m.output.hints.map(hint => <Text key={hint} style={u.muted}>{hint}</Text>)}
      <Text style={u.muted}>Подбор и время обновляются у всех участников. Цена, часы работы и время в пути требуют проверки.</Text>
    </Card>
    {m.members.map(member => <Card key={member.id}><Text style={u.text}>{member.name}{member.id === m.ownerId ? ' · организатор' : ''}</Text>
      <Text style={u.muted}>{member.ready && member.start && member.end ? `${fmt(member.start)} — ${fmt(member.end)}` : 'Анкета не заполнена'}</Text>
      <Text style={u.muted}>{member.desiredPlace ? `Хочет: ${member.desiredPlace.name}` : 'Любое подходящее место'}</Text>
      {m.budget.shortfall.includes(member.id) && <Text style={u.muted}>Не хватает до фиксированной суммы</Text>}
      {member.desiredPlace && <Button kind="quiet" label="Маршрут к желаемому месту" onPress={() => buildRoute(member.desiredPlace!, member.desiredPlace!.id)} />}
    </Card>)}
    {owner && <Card><Text style={u.heading}>Настройки организатора</Text>
      <View style={u.row}>{MODES.map(option => <Chip key={option.id} label={option.label} active={mode === option.id} onPress={() => setMode(option.id)} />)}</View>
      {mode === 'fixed' && <Field label="Нужно каждому, ₽" numeric value={fixed} onChangeText={setFixed} />}
      <Button label="Сохранить режим бюджета" disabled={disabled} onPress={savePlan} />
      <Field label="Время встречи (ЧЧ:ММ, в общем окне)" value={time} onChangeText={setTime} />
      <Button label="Назначить время" disabled={disabled || !m.output.window} onPress={schedule} />
      {!!error && <Text style={u.text}>{error}</Text>}
    </Card>}
    <Text style={u.heading}>Подходящие места</Text>
    {m.output.results.map(result => <Card key={result.place.id}><Text style={u.heading}>{result.place.name}</Text>
      <Text style={u.text}>{result.reason}</Text><Text style={u.muted}>{result.price == null ? 'Цену уточнить' : `${result.price} ₽ на человека`}</Text>
      <Text style={u.muted}>{result.flags.join(' · ')}</Text>
      {owner && <Button label="Выбрать для всей группы" disabled={disabled} onPress={() => lan.act('choose', { placeId: result.place.id })} />}
      <Button kind="quiet" label="Построить маршрут" disabled={!lan.ready} onPress={() => buildRoute(result.place, result.place.id)} />
    </Card>)}
  </View>;
}
