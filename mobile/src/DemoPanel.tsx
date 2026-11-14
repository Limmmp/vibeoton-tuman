import React, { useState } from 'react';
import { Text, View } from 'react-native';
import type { LatLon } from '../../src/engine/protocol';
import { DEMO_SPEEDS, demoPoint } from '../../src/engine/simulation';
import landmarks from '../../public/models/landmarks/manifest.json';
import { Button, Card, Chip, Field, u } from './shared/ui/primitives';

export function DemoPanel({ position, speed, tapMode, busy, teleport, setSpeed, setTapMode, close }: {
  position: LatLon; speed: number; tapMode: 'walk' | 'teleport'; busy: boolean;
  teleport: (point: LatLon) => void; setSpeed: (speed: number) => void;
  setTapMode: (mode: 'walk' | 'teleport') => void; close: () => void;
}) {
  const [lat, setLat] = useState(position.lat.toFixed(6)), [lon, setLon] = useState(position.lon.toFixed(6));
  const [error, setError] = useState('');
  const jump = () => {
    try {
      if (!lat.trim() || !lon.trim()) throw new Error('Заполни обе координаты');
      const point = demoPoint({ lat: Number(lat.replace(',', '.')), lon: Number(lon.replace(',', '.')) });
      setError(''); teleport(point);
    } catch (problem) { setError((problem as Error).message); }
  };
  return <View style={u.stack}>
    <Text style={u.eyebrow}>ДЛЯ ДЕМОНСТРАЦИИ</Text><Text style={u.heading}>Быстрое перемещение</Text>
    <Text style={u.muted}>Демо отключает GPS. Персонаж движется в симуляции, туман открывается по новой позиции.</Text>
    <Card><Text style={u.heading}>1. Телепортация</Text>
      <Button label={tapMode === 'teleport' ? 'Телепорт по нажатию включён · на карту' : 'Выбрать точку нажатием на карту'} disabled={busy} primary onPress={() => setTapMode('teleport')} />
      <Field label="Широта" value={lat} onChangeText={setLat} numeric /><Field label="Долгота" value={lon} onChangeText={setLon} numeric />
      {!!error && <Text style={u.text}>{error}</Text>}<Button label="Телепортироваться по координатам" disabled={busy} onPress={jump} />
      <Text style={u.muted}>Быстрые точки:</Text>{landmarks.map(item => <Button key={item.id} label={item.name} disabled={busy} onPress={() => teleport(item)} />)}
    </Card>
    <Card><Text style={u.heading}>2. Ускоренная прогулка</Text><Text style={u.muted}>Выбери скорость, затем нажми на карте, куда идти.</Text>
      <View style={u.row}>{DEMO_SPEEDS.map(value => <Chip key={value} label={`×${value}${value === 1 ? ' · обычная' : ''}`} active={speed === value} onPress={() => { if (!busy) setSpeed(value); }} />)}</View>
      <Button label="Идти к точке по нажатию" disabled={busy} onPress={() => setTapMode('walk')} />
    </Card><Button label="Вернуться на карту" onPress={close} />
  </View>;
}
