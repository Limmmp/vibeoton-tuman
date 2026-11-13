import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type Session } from './api';
import { useSession } from './session';
import { ProviderMark } from './glyphs';
import { Button, Field, colors, u } from './ui';
import Animated from 'react-native-reanimated';
import { enter } from './motion';

const SOCIAL = [
  { id: 'vk', label: 'VK ID' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'yandex', label: 'Яндекс' },
  { id: 'google', label: 'Google' },
] as const;

/** Вход: почта с паролем, соцсети (кнопки активны, когда на сервере задан ключ провайдера) и демо-вход. */
export function AuthScreen() {
  const { health, signIn, skip } = useSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [demoName, setDemoName] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const run = async (key: string, action: () => Promise<Session>) => {
    setBusy(key); setError('');
    try { await signIn(await action()); } catch (problem) { setError((problem as Error).message); } finally { setBusy(null); }
  };
  const enabled = new Set(health?.providers ?? []);
  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
    <Animated.View entering={enter(0)} style={{ gap: 10 }}>
      <Text style={u.eyebrow}>ТУМАН ВЛАДИВОСТОКА</Text>
      <Text style={s.hero}>Город проясняется,{'\n'}когда вы вместе</Text>
      <Text style={u.muted}>Аккаунт нужен, чтобы звать друзей в пачку, собирать встречи и делить бюджет. Карта и прогулки работают и без него.</Text>
    </Animated.View>

    <Animated.View entering={enter(1)} style={{ gap: 10 }}>
      <View style={s.socialRow}>
        {SOCIAL.map(p => { const on = enabled.has(p.id); return <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`Войти через ${p.label}`} accessibilityState={{ disabled: !on }} disabled={!on}
          onPress={() => setError('Вход через соцсеть откроется в браузере — подключаем после настройки ключей.')} style={({ pressed }) => [s.social, !on && { opacity: 0.38 }, pressed && u.pressed]}>
          <ProviderMark provider={p.id} size={30} /><Text style={s.socialText}>{p.label}</Text>
        </Pressable>; })}
      </View>
      {SOCIAL.every(p => !enabled.has(p.id)) && <Text style={[u.muted, { textAlign: 'center' }]}>VK, Telegram, Яндекс и Google — подключаем. Пока входите по почте.</Text>}
    </Animated.View>

    <Animated.View entering={enter(2)} style={s.card}>
      <View style={s.segment}>
        {(['login', 'register'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => { setMode(value); setError(''); }} style={[s.segmentItem, mode === value && s.segmentOn]}>
          <Text style={[u.label, mode === value && { color: colors.text }]}>{value === 'login' ? 'Вход' : 'Регистрация'}</Text>
        </Pressable>)}
      </View>
      {mode === 'register' && <Field label="Как вас зовут" value={name} onChangeText={setName} />}
      <Field label="Почта" value={email} onChangeText={setEmail} />
      <Field label={mode === 'register' ? 'Пароль · от 8 символов' : 'Пароль'} value={password} onChangeText={setPassword} secure />
      {!!error && <Text style={[u.text, { color: colors.coral }]}>{error}</Text>}
      <Button primary disabled={!!busy || !email.trim() || !password || (mode === 'register' && !name.trim())} label={busy === 'email' ? 'Секунду…' : mode === 'login' ? 'Войти' : 'Создать аккаунт'}
        onPress={() => void run('email', () => mode === 'login' ? api.login(email.trim(), password) : api.register(email.trim(), password, name.trim()))} />
    </Animated.View>

    {health?.devLogin && <View style={[s.card, { borderColor: 'rgba(245,184,61,0.35)' }]}>
      <Text style={u.heading}>Демо-вход</Text>
      <Text style={u.muted}>Для показа: аккаунт по имени, сразу с тремя друзьями — Петей, Машей и Аней.</Text>
      <Field label="Имя" value={demoName} onChangeText={setDemoName} />
      <Button disabled={!!busy || !demoName.trim()} label={busy === 'demo' ? 'Секунду…' : 'Войти для демо'} onPress={() => void run('demo', () => api.devLogin(demoName.trim()))} />
    </View>}

    {busy && <ActivityIndicator color={colors.amber} />}
    <Button kind="quiet" label="Продолжить без аккаунта" onPress={skip} />
  </ScrollView>;
}

const s = StyleSheet.create({
  page: { padding: 24, paddingTop: 48, gap: 24, flexGrow: 1 },
  hero: { color: colors.text, fontFamily: 'Manrope_800ExtraBold', fontSize: 32, lineHeight: 37, letterSpacing: -0.8 },
  socialRow: { flexDirection: 'row', gap: 8 },
  social: { flex: 1, alignItems: 'center', gap: 8, paddingVertical: 14, borderRadius: 18, backgroundColor: colors.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  socialText: { color: colors.text, fontFamily: 'Manrope_600SemiBold', fontSize: 12 },
  card: { backgroundColor: colors.panel, borderRadius: 22, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  segment: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 12, padding: 3 },
  segmentItem: { flex: 1, minHeight: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  segmentOn: { backgroundColor: colors.raised },
});
