import React, { useEffect, useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import type { ActiveStep, Command, LatLon, QuestSummary, RewardResult } from '../../src/engine/protocol';
import { Bar, Button, Card, Chip, u } from './ui';

export type Execute = (command: Command) => Promise<unknown>;
export function ActiveQuest({ active, execute, developer = false, teleport, locate, busy }: { active: ActiveStep; execute: Execute; developer?: boolean; teleport: (point: LatLon) => void; locate: (point: LatLon) => void; busy: boolean }) {
  const { step, runtime, progress } = active;
  const point = active.targets.find(target => !target.done);
  return <Card>
    <Text style={u.eyebrow}>{active.questTitle} · {active.stepIndex + 1}/{active.stepCount}</Text>
    <Text style={u.heading}>{step.text}</Text>
    <Text style={u.muted}>{({ goto: 'Дойти до точки', hold: 'Остаться в зоне', tail: 'Следовать за проводником', collect: 'Собрать точки', explore: 'Исследовать туман', listen: 'Послушать аудио', quiz: 'Ответить на вопрос', look: 'Осмотреть объект', visit: 'Посетить место' })[step.type]}{active.distanceMeters != null ? ` · ${Math.round(active.distanceMeters)} м до цели` : ''}</Text>
    {progress && <><Bar value={progress.current / Math.max(1, progress.total)} /><Text style={u.muted}>{Math.round(progress.current)} / {Math.round(progress.total)} {({ seconds: 'сек.', meters: 'м', cells: 'ячеек', items: 'точек' })[progress.unit]}</Text></>}
    {step.say.map((line, index) => <Text key={index} style={u.text}>{line}</Text>)}
    {step.type === 'goto' && <Text style={u.text}>Дойди до {step.poi.name}.{step.timeLimit ? ` Осталось ${Math.max(0, Math.ceil(step.timeLimit - runtime.elapsed))} сек.` : ''}</Text>}
    {step.type === 'hold' && <Text style={u.text}>Оставайся в радиусе {step.radius} м. При выходе отсчёт начнётся заново.</Text>}
    {step.type === 'tail' && <Text style={u.text}>{!runtime.tailStarted ? 'Подойди к началу пути.' : (active.distanceMeters ?? 0) > step.warnDistance ? 'Отстаёшь. Подойди ближе.' : (active.distanceMeters ?? Infinity) < step.minDistance ? 'Слишком близко к проводнику.' : 'Следуй за проводником.'}</Text>}
    {step.type === 'collect' && <View style={u.stack}>{step.pois.map(poi => <Text key={poi.id} style={u.text}>{runtime.collected?.includes(poi.id) ? '✓' : '○'} {poi.name}</Text>)}</View>}
    {step.type === 'explore' && <Text style={u.text}>Гуляй по закрытой области карты. Нужно открыть {step.cells} новых ячеек.</Text>}
    {step.type === 'visit' && <Text style={u.text}>{step.place.name} · посещение засчитается автоматически в радиусе {step.radius} м.</Text>}
    {step.type === 'quiz' && <Quiz question={step.question} answers={step.answers} busy={busy} execute={execute} developer={developer} />}
    {step.type === 'listen' && <Listen key={`${active.questId}-${step.id}`} audio={step.audio} ready={!!runtime.audioReady} developer={developer} execute={execute} busy={busy} />}
    {step.type === 'look' && <><Text style={u.text}>{step.prompt}</Text><Button label="Подтвердить осмотр" disabled={busy || !runtime.confirmationReady} onPress={() => void execute({ type: 'confirmLook' })} />{!runtime.confirmationReady && <Text style={u.muted}>Кнопка доступна только у точки.</Text>}</>}
    <View style={u.row}>{point && <Button label="На карте" onPress={() => locate(point)} />}{developer && point && <Button label="Телепорт к цели" onPress={() => teleport(point)} />}</View>
    {developer && <Text selectable style={u.muted}>runtime: {JSON.stringify(runtime)}</Text>}
  </Card>;
}

function Quiz({ question, answers, busy, execute, developer }: { question: string; answers: string[]; busy: boolean; execute: Execute; developer: boolean }) {
  const [open, setOpen] = useState(false);
  const content = <View style={u.stack}><Text style={u.heading}>{question}</Text>{answers.map((answer, index) => <Button key={index} label={answer} disabled={busy} onPress={() => void execute({ type: 'answerQuiz', answer: index })} />)}</View>;
  if (developer) return content;
  return <><Button label="Ответить на вопрос" primary onPress={() => setOpen(true)} /><Modal visible={open} onRequestClose={() => setOpen(false)} animationType="slide"><SafeAreaView style={{ flex: 1, backgroundColor: '#0F1720' }}><ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>{content}<Button label="Вернуться к карте" onPress={() => setOpen(false)} /></ScrollView></SafeAreaView></Modal></>;
}

function Listen({ audio, ready, developer, execute, busy }: { audio: string; ready: boolean; developer: boolean; execute: Execute; busy: boolean }) {
  const valid = /^https?:\/\//.test(audio);
  const player = useAudioPlayer(valid ? audio : null);
  const status = useAudioPlayerStatus(player);
  const [finished, setFinished] = useState(false);
  useEffect(() => { if (status.didJustFinish) setFinished(true); }, [status.didJustFinish]);
  useEffect(() => { if (!ready) player.pause(); }, [ready, player]);
  return <View style={u.stack}>
    {valid ? <><Text style={u.muted}>{Math.floor(status.currentTime)} / {Math.floor(status.duration)} сек.</Text><Bar value={status.duration ? status.currentTime / status.duration : 0} /><Button label={status.playing ? 'Пауза' : 'Слушать'} disabled={!ready || !status.isLoaded} onPress={() => { if (status.playing) player.pause(); else { if (finished) { void player.seekTo(0); setFinished(false); } player.play(); } }} /></> : <Text style={u.muted}>Озвучка ещё не добавлена. Тестовое завершение доступно в панели разработчика.</Text>}
    <Button label="Аудио дослушано" disabled={busy || !ready || (!developer && !finished)} onPress={() => void execute({ type: 'completeListen' })} />
    {!ready && <Text style={u.muted}>Сначала подойди к точке аудио.</Text>}
    {developer && <Text style={u.muted}>Тестовая кнопка имитирует окончание аудио. Проверку расстояния выполняет движок.</Text>}
  </View>;
}

export function QuestList({ quests, completed, active, execute, locate, busy }: { quests: QuestSummary[]; completed: string[]; active: ActiveStep | null; execute: Execute; locate: (point: LatLon) => void; busy: boolean }) {
  const [filter, setFilter] = useState('Доступные');
  const filtered = quests.filter(quest => filter === 'Активное' ? quest.id === active?.questId : filter === 'Пройденные' ? completed.includes(quest.id) : !completed.includes(quest.id));
  return <View style={u.stack}><View style={u.row}>{['Доступные', 'Активное', 'Пройденные'].map(label => <Chip key={label} label={label} active={filter === label} onPress={() => setFilter(label)} />)}</View>
    {!filtered.length && <Text style={u.muted}>Заданий здесь пока нет. Обнови список или выбери другую вкладку.</Text>}
    {filtered.map(quest => <Card key={quest.id}><Text style={u.heading}>{quest.title}</Text><Text style={u.eyebrow}>{quest.giver} · {quest.stepCount} шагов</Text><Text style={u.text}>{quest.intro}</Text><Text style={u.muted}>Награда: {quest.reward.xp} опыта · {quest.reward.cash} монет · {quest.reward.rep} уважения</Text><Text style={u.muted}>В симуляции награда не выдаётся.</Text><View style={u.row}><Button label="Точка старта" onPress={() => locate(quest.start)} /><Button label="Запустить квест" primary disabled={busy || !!active} onPress={() => void execute({ type: 'startQuestById', questId: quest.id })} /></View><Button label="Источник" onPress={() => { if (/^https?:\/\//.test(quest.source)) void Linking.openURL(quest.source).catch(() => {}); }} /></Card>)}
  </View>;
}

export function RewardStatus({ result }: { result: RewardResult | null }) {
  return <Card><Text style={u.eyebrow}>СТАТУС НАГРАДЫ</Text><Text style={u.heading}>{!result ? 'Ожидает завершения квеста' : result.granted ? 'Награда получена' : result.reason === 'untrusted-quest' ? 'Демо-режим: награда не выдана' : 'Награда уже получена ранее'}</Text>{result?.granted && <><Text style={u.text}>+{result.reward.xp} опыта · +{result.reward.cash} монет · +{result.reward.rep} уважения</Text><Text style={u.muted}>{result.newItems.length ? `Новых предметов: ${result.newItems.length}. Они доступны в гардеробе.` : 'Новых предметов нет'}</Text></>}</Card>;
}
