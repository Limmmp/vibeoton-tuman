import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { INTERESTS, type Interest } from '../../src/match/matchGroup';
import { Button, Chip, u } from './ui';

export function Onboarding({ finish }: { finish: (role: string, interests: Interest[], gps: boolean) => void }) {
  const [step, setStep] = useState(0);
  const [role, setRole] = useState('Новый житель');
  const [interests, setInterests] = useState<Interest[]>([]);
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 22, flexGrow: 1, justifyContent: 'center' }}>
    <Text style={u.eyebrow}>ТУМАН ВЛАДИВОСТОКА · {step + 1}/4</Text>
    <Text style={u.title}>{['Город проясняется, когда ты в нём живёшь', 'Кто ты?', 'Что тебе интересно?', 'Туман открывается там, где ты идёшь'][step]}</Text>
    {step === 0 && <Text style={u.text}>Открывай улицы, находи места и проходи задания с котом Адмиралом.</Text>}
    {step === 1 && <View style={u.stack}>{['Первокурсник', 'Новый житель', 'Турист', 'Местный'].map(value => <Chip key={value} label={value} active={role === value} onPress={() => setRole(value)} />)}</View>}
    {step === 2 && <View style={u.row}>{Object.entries(INTERESTS).map(([id, value]) => <Chip key={id} label={value.label} active={interests.includes(id as Interest)} onPress={() => setInterests(interests.includes(id as Interest) ? interests.filter(value => value !== id) : [...interests, id as Interest])} />)}</View>}
    {step === 3 ? <><Text style={u.text}>Координаты передаются движку карты в WebView для квестов и открытия тумана. Групп и передачи позиции другим игрокам пока нет. Для тайлов и маршрутов нужен интернет.</Text><Button label="Разрешить геолокацию" primary onPress={() => finish(role, interests, true)} /><Button label="Продолжить в симуляции" onPress={() => finish(role, interests, false)} /></> : <Button label={step === 0 ? 'Войти в туман' : step === 2 ? 'Дальше / пропустить' : 'Дальше'} primary onPress={() => setStep(step + 1)} />}
    {step > 0 && <Button kind="quiet" label="Назад" onPress={() => setStep(step - 1)} />}
  </ScrollView>;
}
