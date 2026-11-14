import React from 'react';
import { Text, View } from 'react-native';
import type { AvatarItem, ProgressState, Command } from '../../../../../src/engine/protocol';
import { Bar, Button, Card, formatArea, u } from '../../../shared/ui/primitives';
import { levelProgress } from '../../../../../src/progress/level';

// Профиль показывает одно: насколько ты уже знаешь город. Гардероб, монеты и магазин
// убраны из интерфейса до появления настоящей экономики; движок их по-прежнему поддерживает.
// Панель разработчика открывается долгим нажатием на значок уровня в верхней плашке.
export function ProfilePanel({ progress, area, execute, districts, collection, settings }: { progress: ProgressState | null; items: AvatarItem[]; area: number; execute: (command: Command) => Promise<unknown>; districts: () => void; collection: () => void; settings: () => void; developer: () => void; busy: boolean }) {
  if (!progress) return <Card><Text style={u.text}>Прогресс пока не загружен.</Text><Button label="Повторить" onPress={() => void execute({ type: 'getProgress' })} /></Card>;
  const level = levelProgress(progress.xp);
  const quests = Object.values(progress.completedQuests);
  return <View style={u.stack}>
    <Text style={u.eyebrow}>МОЙ ВЛАДИВОСТОК</Text>
    <Text style={u.title}>Исследователь{'\n'}{level.level}-го уровня</Text>
    <Card>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}><Text style={u.number}>{formatArea(area)}</Text><Text style={u.muted}>открыто тумана</Text></View>
        <View style={{ flex: 1, gap: 2 }}><Text style={u.number}>{quests.length}</Text><Text style={u.muted}>{quests.length === 1 ? 'квест пройден' : 'квестов пройдено'}</Text></View>
      </View>
      <Bar value={level.fraction} />
      <Text style={u.muted}>{level.earned} из {level.required} опыта до следующего уровня</Text>
    </Card>
    <Button label="Районы и вехи" primary onPress={districts} />
    <Button label="Награды" onPress={collection} />
    {!!quests.length && <><Text style={u.heading}>Пройденные квесты</Text>{quests.map(quest => <Card key={quest.questId}><Text style={u.text}>{quest.title}</Text><Text style={u.muted}>+{quest.reward.xp} опыта</Text></Card>)}</>}
    <Button kind="quiet" label="Настройки" onPress={settings} />
  </View>;
}
