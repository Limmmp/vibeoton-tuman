import React from 'react';
import { Text, View } from 'react-native';
import type { DistrictStat, LatLon } from '../../src/engine/protocol';
import { Bar, Button, Card, u } from './ui';
export function DistrictPanel({ districts, locate, refresh }: { districts: DistrictStat[]; locate: (point: LatLon) => void; refresh: () => void }) {
  return <View style={u.stack}><Text style={u.heading}>Районы Владивостока</Text><Text style={u.muted}>Доля открытых уличных ячеек. Вехи: 25, 50, 75 и 90%. Награды начисляет движок один раз.</Text><Button label="Обновить районы" onPress={refresh} />{!districts.length && <Text style={u.muted}>Данные районов ещё не загружены.</Text>}{districts.map(district => <Card key={district.id}><Text style={u.heading}>{district.name} · {district.pct}%</Text><Bar value={district.pct / 100} /><Text style={u.muted}>{district.revealed} / {district.total} ячеек · последняя веха {district.milestone}%</Text><Button label="На карте" onPress={() => locate(district)} /></Card>)}</View>;
}
