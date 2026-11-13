import React from 'react';
import { Text, View } from 'react-native';
import type { AvatarItem, ProgressState } from '../../src/engine/protocol';
import type { Execute } from './QuestPanel';
import { Bar, Button, Card, u } from './ui';

export function ProfilePanel({ progress, items, area, execute, districts, collection, settings, developer, busy }: { progress: ProgressState | null; items: AvatarItem[]; area: number; execute: Execute; districts: () => void; collection: () => void; settings: () => void; developer: () => void; busy: boolean }) {
  if (!progress) return <Card><Text style={u.text}>Прогресс пока не загружен.</Text><Button label="Повторить" onPress={() => void execute({ type: 'getProgress' })} /></Card>;
  const floor = 100 * (progress.level - 1) ** 2;
  const next = 100 * progress.level ** 2;
  return <View style={u.stack}><Text style={u.eyebrow}>МОЙ ВЛАДИВОСТОК</Text><Text style={u.title}>Исследователь · ур. {progress.level}</Text><Card><Text style={u.text}>{progress.xp} опыта · следующий уровень: {next}</Text><Bar value={(progress.xp - floor) / (next - floor)} /><Text style={u.text}>{progress.cash} монет · {progress.rep} уважения</Text><Text style={u.muted}>Открыто {area.toFixed(4)} км². Прогресс районов доступен отдельно.</Text></Card>
    <Button label="Коллекция достопримечательностей" onPress={collection} /><Button label="Районы и вехи" onPress={districts} /><Text style={u.heading}>Гардероб</Text><Text style={u.muted}>Предметы меняют внешний вид, без игровых преимуществ.</Text>
    {!items.length && <Text style={u.muted}>Каталог предметов пока не загружен.</Text>}
    {items.map(item => { const owned = (progress.inventory[item.id] ?? 0) > 0; const equipped = progress.equipped[item.slot] === item.id; return <Card key={item.id}><Text style={u.heading}>{owned ? '●' : '○'} {item.name}</Text><Text style={u.muted}>{({ common: 'Обычный', rare: 'Редкий', legendary: 'Легендарный' })[item.rarity]} · {owned ? `В наличии: ${progress.inventory[item.id]}` : 'Не получен'}</Text><Button label={equipped ? 'Снять' : 'Надеть'} disabled={busy || !owned} onPress={() => void execute(equipped ? { type: 'unequipAvatarSlot', slot: item.slot } : { type: 'equipAvatarItem', itemId: item.id })} /></Card>; })}
    <Text style={u.heading}>Пройденные квесты</Text>{!Object.keys(progress.completedQuests).length && <Text style={u.muted}>Заверши квест с GPS, чтобы получить первую награду.</Text>}{Object.values(progress.completedQuests).map(quest => <Text style={u.text} key={quest.questId}>{quest.title} · +{quest.reward.xp} опыта</Text>)}
    <Card><Text style={u.heading}>Магазин</Text><Text style={u.muted}>Покупки фигурок будут добавлены отдельно. Превью четырёх достопримечательностей доступны в коллекции.</Text></Card><Button label="Настройки" onPress={settings} /><Button label="Для разработчиков" onPress={developer} />
  </View>;
}
