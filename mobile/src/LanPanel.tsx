import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import type { LatLon, OtherPlayer } from '../../src/engine/protocol';
import { MapBridge } from './bridge';
import { localMapUrl } from './connection';
import { Button, Field, u } from './ui';

export function useLan(bridge: MapBridge, ready: boolean, position: LatLon) {
  const [address, setAddress] = useState(localMapUrl);
  const [name, setName] = useState('Игрок');
  const [enabled, setEnabled] = useState(false);
  const [group, setGroup] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [players, setPlayers] = useState<OtherPlayer[]>([]);
  const token = useRef('');
  const latest = useRef({ position, name }); latest.current = { position, name };
  const action = useRef('');
  const joinCode = useRef('');
  useEffect(() => {
    if (!enabled || !ready) return;
    let live = true;
    let timer: ReturnType<typeof setTimeout>;
    let controller: AbortController;
    const tick = async () => {
      controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const pending = action.current; action.current = '';
      try {
        const response = await fetch(`${address.replace(/\/$/, '')}/lan`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal, body: JSON.stringify({ token: token.current, ...latest.current.position, name: latest.current.name, action: pending, code: joinCode.current }) });
        const data = await response.json();
        if (!response.ok) throw Error(data.error || 'Сервер недоступен');
        if (!live) return;
        token.current = data.token; setGroup(data.group); setPlayers(data.players); setError('');
        await bridge.request({ type: 'setSocialLayer', mode: 'all' });
        if (live) await bridge.request({ type: 'showPlayers', players: data.players });
      } catch (problem) { if (live) { setError(`Нет связи: ${(problem as Error).message}`); setPlayers([]); void bridge.request({ type: 'showPlayers', players: [] }).catch(() => {}); } }
      finally { clearTimeout(timeout); if (live) timer = setTimeout(tick, 2000); }
    };
    void tick();
    return () => { live = false; clearTimeout(timer); controller?.abort(); void bridge.request({ type: 'showPlayers', players: [] }).catch(() => {}); };
  }, [enabled, ready, address, bridge]);
  return { address, setAddress, name, setName, enabled, setEnabled, group, code, setCode, error, players, act: (value: string) => { joinCode.current = code; action.current = value; } };
}

export function LanPanel({ lan }: { lan: ReturnType<typeof useLan> }) {
  return <View style={u.stack}><Text style={u.heading}>Игроки общей сети</Text>
    <Text style={u.muted}>Подключитесь к одному Wi-Fi. Укажите адрес компьютера с сервером карты. Координаты видны участникам сессии.</Text>
    <Field label="Сервер, например http://192.168.1.10:5173" value={lan.address} onChangeText={lan.setAddress} />
    <Field label="Имя" value={lan.name} onChangeText={lan.setName} />
    <Button label={lan.enabled ? 'Отключиться' : 'Подключиться'} onPress={() => lan.setEnabled(!lan.enabled)} />
    {!!lan.error && <Text style={u.text}>{lan.error}</Text>}
    {lan.enabled && <><Text style={u.text}>{lan.group ? `Группа: ${lan.group}` : 'Без группы'}</Text>
      <Button label="Создать группу" onPress={() => lan.act('create')} />
      <Field label="Код группы" value={lan.code} onChangeText={lan.setCode} />
      <Button label="Вступить" onPress={() => lan.act('join')} />
      {!!lan.group && <Button label="Выйти из группы" onPress={() => lan.act('leave')} />}
      {lan.players.map(p => <Text key={p.id} style={u.text}>{p.name}{p.relation === 'party' ? ' · группа' : ''}</Text>)}</>}
  </View>;
}
