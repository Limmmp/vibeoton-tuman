import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { INTERESTS, type Interest } from '../../src/match/matchGroup';
import type { LatLon } from '../../src/engine/protocol';
import { api, type BudgetMode, type Meeting, type Party, type Suggestion, type User } from './api';
import { useSession } from './session';
import { Avatar, AvatarStack } from './Avatar';
import { Glyph } from './glyphs';
import { Button, Card, Chip, Field, colors, u } from './ui';

const MODES: { id: BudgetMode; title: string; text: string }[] = [
  { id: 'individual', title: 'Каждый за себя', text: 'Место подойдёт самому скромному бюджету' },
  { id: 'pooled', title: 'Скидываемся', text: 'Общий котёл: кто может больше — выручает' },
  { id: 'fixed', title: 'Одна сумма', text: 'Вы назначаете сумму, она нужна каждому' },
];
const DAYS = ['Сегодня', 'Завтра', 'Послезавтра'];
const vlDate = (day: number) => new Date(Date.now() + 10 * 3600000 + day * 86400000).toISOString().slice(0, 10);
const toIso = (day: number, time: string) => new Date(`${vlDate(day)}T${time}:00+10:00`).toISOString();
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Vladivostok', hour: '2-digit', minute: '2-digit' });
const fmtDay = (iso: string) => {
  const d = new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Vladivostok', day: 'numeric', month: 'long' });
  const i = [0, 1, 2].find(n => vlDate(n) === new Date(new Date(iso).getTime() + 10 * 3600000).toISOString().slice(0, 10));
  return i !== undefined ? `${DAYS[i]}, ${d}` : d;
};
const rsvpLabel = { going: 'идёт', invited: 'ждём ответа', declined: 'не сможет' } as const;

/** «Куда пойдём» с аккаунтом: встречи с друзьями и пачками, режимы бюджета, подбор, голоса, маршрут. */
export function MeetingsPanel({ buildRoute, quickMatch }: { buildRoute: (point: LatLon, id?: string) => void; quickMatch: () => void }) {
  const { me } = useSession();
  const [view, setView] = useState<{ kind: 'list' } | { kind: 'new' } | { kind: 'meeting'; id: string }>({ kind: 'list' });
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => { try { setMeetings((await api.meetings()).meetings); setError(''); } catch (problem) { setError((problem as Error).message); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  if (!me) return null;
  if (view.kind === 'new') return <NewMeeting back={() => setView({ kind: 'list' })} created={m => { void refresh(); setView({ kind: 'meeting', id: m.id }); }} />;
  if (view.kind === 'meeting') return <MeetingView id={view.id} back={() => { void refresh(); setView({ kind: 'list' }); }} buildRoute={buildRoute} />;
  return <View style={{ gap: 18 }}>
    <View style={{ gap: 6 }}><Text style={u.eyebrow}>КУДА ПОЙДЁМ</Text><Text style={u.title}>Встречи</Text><Text style={u.muted}>Позовите друзей или пачку, договоритесь о бюджете — подберём место, которое подойдёт всем.</Text></View>
    <Button primary label="Новая встреча" onPress={() => setView({ kind: 'new' })} />
    {!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}
    {meetings.map(m => <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={m.title} onPress={() => setView({ kind: 'meeting', id: m.id })} style={({ pressed }) => [s.meeting, pressed && u.pressed]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}><Text style={u.heading} numberOfLines={1}>{m.title}</Text><Text style={u.muted}>{fmtDay(m.startsAt)} · {fmtTime(m.startsAt)}–{fmtTime(m.endsAt)}</Text></View>
        <Glyph name="chevronRight" size={20} color={colors.faint} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <AvatarStack avatars={m.members.map(x => x.user.avatar)} size={26} />
        <Text style={[u.muted, { flex: 1 }]} numberOfLines={1}>{m.status === 'chosen' && m.place?.name ? `Идём: ${m.place.name}` : m.budget.label}</Text>
      </View>
    </Pressable>)}
    {!meetings.length && !error && <Text style={u.muted}>Встреч пока нет.</Text>}
    <Button kind="quiet" label="Быстрый подбор без встречи" onPress={quickMatch} />
  </View>;
}

function NewMeeting({ back, created }: { back: () => void; created: (m: Meeting) => void }) {
  const [friends, setFriends] = useState<User[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [title, setTitle] = useState('Встреча');
  const [partyId, setPartyId] = useState<string | null>(null);
  const [ids, setIds] = useState<string[]>([]);
  const [day, setDay] = useState(0);
  const [start, setStart] = useState('18:00');
  const [end, setEnd] = useState('21:00');
  const [mode, setMode] = useState<BudgetMode>('individual');
  const [fixed, setFixed] = useState('500');
  const [myBudget, setMyBudget] = useState('500');
  const [indoor, setIndoor] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { void Promise.all([api.friends(), api.parties()]).then(([f, p]) => { setFriends(f.friends); setParties(p.parties); }).catch(problem => setError((problem as Error).message)); }, []);
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  const create = async () => {
    if (!time.test(start) || !time.test(end)) { setError('Время в формате ЧЧ:ММ, например 18:30'); return; }
    setBusy(true); setError('');
    try {
      created(await api.createMeeting({ title: title.trim() || 'Встреча', startsAt: toIso(day, start), endsAt: toIso(day, end), budgetMode: mode, fixedBudget: mode === 'fixed' ? Number(fixed) || 0 : undefined, myBudget: Number(myBudget) || 0, indoorOnly: indoor, ...(partyId ? { partyId } : { memberIds: ids }) }));
    } catch (problem) { setError((problem as Error).message); } finally { setBusy(false); }
  };
  return <View style={{ gap: 18 }}>
    <Button kind="quiet" label="‹ Встречи" onPress={back} style={{ alignSelf: 'flex-start' }} />
    <Text style={u.title}>Новая встреча</Text>
    <Field label="Название" value={title} onChangeText={setTitle} />
    <View style={{ gap: 8 }}>
      <Text style={u.label}>Кого зовём</Text>
      {parties.length > 0 && <View style={u.row}>{parties.map(p => <Chip key={p.id} label={`${p.name} · ${p.members.length}`} active={partyId === p.id} onPress={() => { setPartyId(partyId === p.id ? null : p.id); setIds([]); }} />)}</View>}
      {!partyId && <View style={u.row}>{friends.map(f => <Chip key={f.id} label={f.name} active={ids.includes(f.id)} onPress={() => setIds(ids.includes(f.id) ? ids.filter(x => x !== f.id) : [...ids, f.id])} />)}</View>}
      {!friends.length && <Text style={u.muted}>Добавьте друзей в профиле — по коду или нику.</Text>}
    </View>
    <View style={{ gap: 8 }}>
      <Text style={u.label}>Когда</Text>
      <View style={u.row}>{DAYS.map((d, i) => <Chip key={d} label={d} active={day === i} onPress={() => setDay(i)} />)}</View>
      <View style={{ flexDirection: 'row', gap: 10 }}><View style={{ flex: 1 }}><Field label="С" value={start} onChangeText={setStart} /></View><View style={{ flex: 1 }}><Field label="До" value={end} onChangeText={setEnd} /></View></View>
    </View>
    <View style={{ gap: 8 }}>
      <Text style={u.label}>Бюджет</Text>
      {MODES.map(m => <Pressable key={m.id} accessibilityRole="radio" accessibilityState={{ selected: mode === m.id }} onPress={() => setMode(m.id)} style={({ pressed }) => [s.mode, mode === m.id && s.modeOn, pressed && u.pressed]}>
        <View style={[s.radio, mode === m.id && s.radioOn]}>{mode === m.id && <View style={s.radioDot} />}</View>
        <View style={{ flex: 1, gap: 2 }}><Text style={u.text}>{m.title}</Text><Text style={u.muted}>{m.text}</Text></View>
      </Pressable>)}
      {mode === 'fixed' && <Field label="Сумма на человека, ₽" value={fixed} onChangeText={setFixed} numeric />}
      <Field label={mode === 'fixed' ? 'Сколько есть у вас, ₽' : 'Ваш бюджет, ₽'} value={myBudget} onChangeText={setMyBudget} numeric />
      <Chip label="Только в помещении" active={indoor} onPress={() => setIndoor(!indoor)} />
    </View>
    {!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}
    <Button primary label={busy ? 'Создаём…' : 'Позвать'} disabled={busy || (!partyId && !ids.length)} onPress={() => void create()} />
  </View>;
}

function MeetingView({ id, back, buildRoute }: { id: string; back: () => void; buildRoute: (point: LatLon, id?: string) => void }) {
  const { me } = useSession();
  const [m, setM] = useState<Meeting | null>(null);
  const [results, setResults] = useState<Suggestion[] | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const x = await api.meeting(id); setM(x); const mine = x.members.find(r => r.user.id === me?.id); if (mine?.budget !== undefined) setBudget(String(mine.budget)); } catch (problem) { setError((problem as Error).message); } }, [id, me?.id]);
  useEffect(() => { void load(); }, [load]);
  if (!m || !me) return <View style={{ gap: 12 }}><Button kind="quiet" label="‹ Встречи" onPress={back} style={{ alignSelf: 'flex-start' }} />{!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}</View>;
  const mine = m.members.find(r => r.user.id === me.id)!;
  const owner = m.ownerId === me.id;
  const run = async (action: () => Promise<Meeting | void>) => { setError(''); try { const r = await action(); if (r) setM(r); } catch (problem) { setError((problem as Error).message); } };
  const suggest = async () => {
    setBusy(true); setError('');
    try { const r = await api.suggest(m.id); setResults(r.results); setHints(r.hints); } catch (problem) { setError((problem as Error).message); } finally { setBusy(false); }
  };
  const short = new Set(m.budget.shortfall.map(x => x.userId));
  return <View style={{ gap: 18 }}>
    <Button kind="quiet" label="‹ Встречи" onPress={back} style={{ alignSelf: 'flex-start' }} />
    <View style={{ gap: 4 }}><Text style={u.title}>{m.title}</Text><Text style={u.muted}>{fmtDay(m.startsAt)} · {fmtTime(m.startsAt)}–{fmtTime(m.endsAt)}{m.indoorOnly ? ' · в помещении' : ''}</Text></View>

    {m.status === 'chosen' && m.place && <View style={[s.meeting, { borderColor: 'rgba(245,184,61,0.6)', borderWidth: 1 }]}>
      <Text style={u.eyebrow}>МЕСТО ВЫБРАНО</Text><Text style={u.heading}>{m.place.name ?? 'Место'}</Text>
      {m.place.lat != null && <Button primary label="Маршрут" onPress={() => buildRoute({ lat: m.place!.lat!, lon: m.place!.lon! }, m.place!.id)} />}
      <Button kind="quiet" label="Позвать в мессенджере" onPress={() => void Share.share({ message: `${m.title}: ${m.place?.name ?? ''}, ${fmtDay(m.startsAt)} в ${fmtTime(m.startsAt)}. Собираемся в «Тумане Владивостока».` })} />
    </View>}

    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Glyph name="wallet" size={22} color={colors.amber} /><Text style={[u.text, { flex: 1 }]}>{m.budget.label}</Text></View>
      {m.budgetMode === 'fixed' && m.budget.shortfall.length > 0 && <Text style={u.muted}>Не хватает: {m.members.filter(r => short.has(r.user.id)).map(r => r.user.name).join(', ')}</Text>}
    </Card>

    <View style={{ gap: 8 }}>
      <Text style={u.label}>Кто идёт</Text>
      {m.members.map(r => <View key={r.user.id} style={s.member}>
        <Avatar avatar={r.user.avatar} size={36} />
        <View style={{ flex: 1 }}><Text style={u.text}>{r.user.id === me.id ? 'Вы' : r.user.name}{r.noClimb ? ' · без подъёмов' : ''}</Text><Text style={u.muted}>{rsvpLabel[r.rsvp]}{m.budgetMode === 'fixed' ? (r.enough ? ' · сумма есть' : ' · не хватает') : ''}</Text></View>
        {r.rsvp === 'going' && <Glyph name="check" size={18} color={colors.teal} stroke={2.2} />}
      </View>)}
    </View>

    <Card>
      <Text style={u.heading}>Ваш ответ</Text>
      <View style={u.row}><Chip label="Иду" active={mine.rsvp === 'going'} onPress={() => void run(() => api.rsvp(m.id, { rsvp: 'going' }))} /><Chip label="Не смогу" active={mine.rsvp === 'declined'} onPress={() => void run(() => api.rsvp(m.id, { rsvp: 'declined' }))} /><Chip label="Без крутых подъёмов" active={mine.noClimb} onPress={() => void run(() => api.rsvp(m.id, { noClimb: !mine.noClimb }))} /></View>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}><Field label={m.budgetMode === 'fixed' ? `Сколько есть у вас · нужно ${m.fixedBudget} ₽` : 'Мой бюджет, ₽'} value={budget} onChangeText={setBudget} numeric /></View>
        <Button label="Сохранить" onPress={() => void run(() => api.rsvp(m.id, { budget: Number(budget) || 0 }))} />
      </View>
      <Text style={u.muted}>Сумму видите только вы — остальные видят, хватает ли её.</Text>
      <Text style={u.label}>Что хочется</Text>
      <View style={u.row}>{(Object.keys(INTERESTS) as Interest[]).map(key => <Chip key={key} label={INTERESTS[key].label} active={mine.interests.includes(key)} onPress={() => void run(() => api.rsvp(m.id, { interests: mine.interests.includes(key) ? mine.interests.filter(x => x !== key) : [...mine.interests, key].slice(0, 5) }))} />)}</View>
    </Card>

    <Button primary={m.status !== 'chosen'} label={busy ? 'Подбираем…' : results ? 'Подобрать заново' : 'Подобрать места'} disabled={busy} onPress={() => void suggest()} />
    {!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}
    {hints.map(h => <Text key={h} style={u.muted}>{h}</Text>)}
    {results?.map((r, rank) => { const v = m.votes[r.place.id]; const my = m.myVotes[r.place.id]; return <View key={r.place.id} style={s.meeting}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}><Text style={s.rank}>{rank + 1}</Text><Text style={[u.heading, { flex: 1 }]}>{r.place.name}</Text>{v && <Text style={u.label}>{v.score > 0 ? '+' : ''}{v.score}</Text>}</View>
      <Text style={u.text}>{r.reason}</Text>
      <Text style={u.muted}>{r.price == null ? 'Цену уточнить' : r.price === 0 ? 'Бесплатно' : `${r.price} ₽ на человека`}{r.travel.length ? ` · в пути ~${Math.max(...r.travel.map(t => t.minutes))} мин` : ''}</Text>
      <View style={u.row}>
        <Chip label="За" active={my === 1} onPress={() => void run(() => api.vote(m.id, r.place.id, my === 1 ? 0 : 1))} />
        <Chip label="Против" active={my === -1} onPress={() => void run(() => api.vote(m.id, r.place.id, my === -1 ? 0 : -1))} />
        <Button kind="quiet" label="Маршрут" onPress={() => buildRoute({ lat: r.place.lat, lon: r.place.lon }, r.place.id)} />
      </View>
      {owner && <Button primary={rank === 0} label="Выбрать это место" onPress={() => void run(() => api.choose(m.id, r.place.id))} />}
    </View>; })}
    {owner && <Button kind="quiet" label="Отменить встречу" onPress={() => void run(async () => { await api.cancel(m.id); back(); })} />}
  </View>;
}

const s = StyleSheet.create({
  meeting: { backgroundColor: colors.panel, borderRadius: 22, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: colors.panel },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.line },
  modeOn: { borderColor: 'rgba(245,184,61,0.6)', backgroundColor: colors.amberSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.amber },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.amber },
  rank: { color: colors.amber, fontFamily: 'Manrope_800ExtraBold', fontSize: 22, letterSpacing: -0.4, width: 22 },
});
