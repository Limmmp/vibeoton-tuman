import React, { useState } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import type { ActiveStep, RewardResult } from '../../src/engine/protocol';
import { Button, Chip, u } from './ui';

export function StylePreview({ active, reward, area, level }: { active: ActiveStep | null; reward: RewardResult | null; area: number; level: number }) {
  const system = useColorScheme();
  const [theme, setTheme] = useState<'system' | 'light' | 'dark'>('system');
  const [style, setStyle] = useState<'hud' | 'max'>('hud');
  const light = theme === 'light' || (theme === 'system' && system === 'light');
  const palette = light ? { bg: '#EAE4D8', surface: '#FFFCF5', text: '#192D37', border: '#B8AA90', accent: '#795100' } : { bg: '#0F1720', surface: '#20323F', text: '#EDF1F4', border: '#536775', accent: '#F5B83D' };
  return <View style={u.stack}><Text style={u.heading}>Пробный экран для команды</Text><Text style={u.muted}>Сравнение стилей, не выбор окончательного дизайна. Иллюстрации пока заменены подписями.</Text><View style={u.row}><Chip label="Игровой HUD" active={style === 'hud'} onPress={() => setStyle('hud')} /><Chip label="Стиль Макса" active={style === 'max'} onPress={() => setStyle('max')} /></View><View style={u.row}>{(['system', 'light', 'dark'] as const).map(value => <Chip key={value} label={({ system: 'Как в системе', light: 'Светлая', dark: 'Тёмная' })[value]} active={theme === value} onPress={() => setTheme(value)} />)}</View>
    <View style={{ backgroundColor: palette.bg, padding: 16, gap: 20, borderRadius: 24 }}>
      <Text style={{ color: palette.text, fontFamily: 'RussoOne_400Regular', fontSize: 22 }}>Мой Владивосток</Text>
      {[
        ['Карта · шапка', `Уровень ${level} · открыто ${area.toFixed(4)} км²`],
        ['Активный шаг', active ? `${active.questTitle}\n${active.stepIndex + 1}/${active.stepCount} · ${active.step.text}` : 'Нет активного квеста'],
        ['Награда', reward ? reward.granted ? `+${reward.reward.xp} опыта · +${reward.reward.cash} монет` : 'Демо-режим: награда не выдана' : 'Награда ещё не получена'],
      ].map(([title, text]) => <View key={title} style={{ backgroundColor: palette.surface, padding: 20, gap: 12, borderRadius: style === 'hud' ? 12 : 24, borderWidth: 1, borderColor: palette.border, ...(style === 'max' ? { shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 8, elevation: 2 } : {}) }}><Text style={{ color: palette.accent, fontSize: 12 }}>{title}</Text>{style === 'max' && <Text style={{ color: palette.text }}>Адмирал · место для иллюстрации</Text>}<Text style={{ color: palette.text, fontFamily: 'Manrope_400Regular', fontSize: 16 }}>{text}</Text></View>)}
      <Text style={{ color: palette.text }}>Карта · Компания · Места · История · Профиль</Text>
    </View>
  </View>;
}
