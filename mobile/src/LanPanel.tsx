import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { LatLon, OtherPlayer } from '../../src/engine/protocol';
import { MapBridge } from './bridge';
import { localMapUrl } from './connection';
import { Button, Field, u } from './ui';
import type { MeetingView } from '../../src/social/meeting';
import { LanMeetingPanel, MeetingPreferencesForm } from './LanMeetingPanel';

type Action = { action: string; [key: string]: unknown };

export function useLan(bridge: MapBridge, ready: boolean, position: LatLon) {
  const [address, setAddress] = useState(localMapUrl);
  const [name, setName] = useState('Игрок');
  const [enabled, setEnabled] = useState(false);
  const [group, setGroup] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<OtherPlayer[]>([]);
  const [meeting, setMeeting] = useState<MeetingView | null>(null);
  const [selfId, setSelfId] = useState('');
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const token = useRef('');
  const tokenAddress = useRef(address);
  const latest = useRef({ position, name }); latest.current = { position, name };
  const action = useRef<Action | null>(null);
  const actionBusy = useRef(false);
  const wake = useRef<(() => void) | null>(null);
  useEffect(() => {
    if (!enabled || !ready) return;
    if (tokenAddress.current !== address) { token.current = ''; tokenAddress.current = address; setMeeting(null); setGroup(''); }
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    let inFlight = false;
    const tick = async () => {
      inFlight = true;
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const queued = action.current; action.current = null;
      try {
        const response = await fetch(`${address.replace(/\/$/, '')}/lan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ token: token.current, ...latest.current.position, name: latest.current.name, ...queued }) });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Сервер недоступен');
        if (!live) return;
        token.current = data.token; setSelfId(data.id); setGroup(data.group); setMeeting(data.meeting ?? null); setPlayers(data.players); setError('');
        await bridge.request({ type: 'setSocialLayer', mode: 'all' });
        if (live) await bridge.request({ type: 'showPlayers', players: data.players });
      } catch (problem) { if (live) { if (queued) setActionError((problem as Error).message); else setError(`Нет связи: ${(problem as Error).message}`); setPlayers([]); void bridge.request({ type: 'showPlayers', players: [] }).catch(() => {}); } }
      finally {
        clearTimeout(timeout); inFlight = false;
        if (queued && live) { actionBusy.current = false; setPending(false); }
        if (live) timer = setTimeout(tick, action.current ? 0 : 2000);
      }
    };
    wake.current = () => { if (!inFlight) { clearTimeout(timer); void tick(); } };
    void tick();
    return () => { live = false; wake.current = null; action.current = null; actionBusy.current = false; setPending(false); clearTimeout(timer); controller?.abort(); void bridge.request({ type: 'showPlayers', players: [] }).catch(() => {}); };
  }, [enabled, ready, address, bridge]);
  const act = (value: string, payload: Record<string, unknown> = {}) => {
    if (!enabled || !ready || actionBusy.current) return;
    actionBusy.current = true; setPending(true); setActionError('');
    action.current = { ...payload, action: value, code }; wake.current?.();
  };
  return { address, setAddress, name, setName, enabled, setEnabled, group, code, setCode, error: actionError || error, players, meeting, selfId, pending, act, ready };
}

export function LanPanel({ lan, buildRoute }: { lan: ReturnType<typeof useLan>; buildRoute: (point: LatLon, id?: string) => void }) {
  return <View style={u.stack}><Text style={u.heading}>Игроки общей сети</Text>
    <Text style={u.muted}>Подключитесь к одному Wi-Fi. Укажите адрес компьютера с сервером карты. Координаты видны участникам сессии.</Text>
    <Field label="Сервер, например http://192.168.1.10:5173" value={lan.address} onChangeText={lan.setAddress} />
    <Field label="Имя" value={lan.name} onChangeText={lan.setName} />
    <Button label={lan.enabled ? 'Отключиться' : 'Подключиться'} onPress={() => lan.setEnabled(!lan.enabled)} />
    {!!lan.error && <Text style={u.text}>{lan.error}</Text>}
    {lan.enabled && <><Text style={u.text}>{lan.group ? `Группа: ${lan.group}` : 'Без группы'}</Text>
      {lan.group && lan.meeting ? <LanMeetingPanel lan={lan} buildRoute={buildRoute} /> : <MeetingPreferencesForm key="join" lan={lan} />}
      {!!lan.group && <Button label="Выйти из группы" disabled={lan.pending} onPress={() => lan.act('leave')} />}
      {lan.players.map(p => <Text key={p.id} style={u.text}>{p.name}{p.relation === 'party' ? ' · группа' : ''}</Text>)}</>}
  </View>;
}
