import React, { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, font } from '../theme/tokens';

// Совместимость со старым публичным импортом во время постепенной миграции.
export { colors } from '../theme/tokens';

type ButtonKind = 'primary' | 'secondary' | 'quiet';

/**
 * Нажатие: отклик на касании, а не после отпускания — сжатие до 0,97 за 120 мс (CSS-переход Reanimated
 * на UI-потоке). Масштаб уносит с собой текст и иконки, поэтому читается как физическая кнопка.
 */
function Press({ onPress, onLongPress, disabled, style, innerStyle, children, role = 'button', selected, haptic }: { onPress: () => void; onLongPress?: () => void; disabled?: boolean; style?: StyleProp<ViewStyle>; innerStyle: StyleProp<ViewStyle>; children: ReactNode; role?: 'button' | 'tab' | 'radio'; selected?: boolean; haptic?: boolean }) {
  const [down, setDown] = useState(false);
  const reducedMotion = useReducedMotion();
  return <Pressable accessibilityRole={role} accessibilityState={{ disabled: !!disabled, selected }} disabled={disabled} hitSlop={4} pressRetentionOffset={12} style={style}
    onPressIn={() => setDown(true)} onPressOut={() => setDown(false)} onLongPress={onLongPress}
    onPress={() => { if (haptic && Platform.OS !== 'web') void Haptics.selectionAsync().catch(() => {}); onPress(); }}>
    <Animated.View style={[innerStyle, { transform: [{ scale: down && !reducedMotion ? 0.97 : 1 }], opacity: down ? 0.88 : 1, transitionProperty: ['transform', 'opacity', 'backgroundColor', 'borderColor'], transitionDuration: reducedMotion ? 0 : 120, transitionTimingFunction: 'ease-out' } as object]}>{children}</Animated.View>
  </Pressable>;
}

export function Button({ label, onPress, onLongPress, disabled, primary, kind, style, loading = false }: { label: string; onPress: () => void; onLongPress?: () => void; disabled?: boolean; primary?: boolean; kind?: ButtonKind; style?: StyleProp<ViewStyle>; loading?: boolean }) {
  const reducedMotion = useReducedMotion();
  const variant: ButtonKind = kind ?? (primary ? 'primary' : 'secondary');
  return <Press onPress={onPress} onLongPress={onLongPress} disabled={disabled || loading} style={style} innerStyle={[u.button, variant === 'primary' && u.primary, variant === 'quiet' && u.quiet, disabled && !loading && u.disabled]}>
    {loading && !reducedMotion && <ActivityIndicator color={variant === 'primary' ? colors.bg : colors.text} />}
    <Text style={[u.buttonText, variant === 'primary' && { color: colors.bg }, variant === 'quiet' && { color: colors.amber }]}>{label}</Text>
  </Press>;
}
/** Чип — выбор: лёгкий тактильный «щелчок», как у переключателя в iOS. */
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Press onPress={onPress} selected={!!active} haptic innerStyle={[u.chip, active && u.chipActive]}>
    <Text style={[u.chipText, active && { color: colors.amber }]}>{label}</Text>
  </Press>;
}
export function Field({ label, value, onChangeText, numeric = false, secure = false, placeholder }: { label: string; value: string; onChangeText: (text: string) => void; numeric?: boolean; secure?: boolean; placeholder?: string }) {
  return <View style={{ gap: 6 }}><Text style={u.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} secureTextEntry={secure} autoCapitalize="none" autoCorrect={!secure} placeholder={placeholder} placeholderTextColor={colors.faint} selectionColor={colors.amber} style={u.input} /></View>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={u.card}>{children}</View>; }
export function Bar({ value }: { value: number }) {
  const percent = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) * 100 : 0;
  return <View accessibilityRole="progressbar" accessibilityLabel="Опыт до следующего уровня" accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }} style={u.track}><View style={[u.fill, { width: `${percent}%` }]} /></View>;
}
/** Площадь по-человечески: до 0,1 км² — в тысячах м², дальше — в км² с двумя знаками. */
export function formatArea(km2: number) {
  if (!Number.isFinite(km2) || km2 <= 0) return '0 м²';
  if (km2 < 0.1) return `${Math.round(km2 * 1e6).toLocaleString('ru-RU')} м²`;
  return `${km2.toFixed(2).replace('.', ',')} км²`;
}

// Типографика: трекинг зависит от размера — крупное поджимаем, мелкое чуть разрежаем.
export const u = StyleSheet.create({
  title: { color: colors.text, fontFamily: font.heavy, fontSize: 28, lineHeight: 33, letterSpacing: -0.6 },
  heading: { color: colors.text, fontFamily: font.bold, fontSize: 18, lineHeight: 23, letterSpacing: -0.2 },
  text: { color: colors.text, fontFamily: font.regular, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontFamily: font.regular, fontSize: 13, lineHeight: 19 },
  label: { color: colors.muted, fontFamily: font.semibold, fontSize: 13, lineHeight: 17 },
  eyebrow: { color: colors.amber, fontFamily: font.bold, fontSize: 11, lineHeight: 14, letterSpacing: 1.4 },
  number: { color: colors.text, fontFamily: font.heavy, fontSize: 22, lineHeight: 26, letterSpacing: -0.4 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  stack: { gap: 12 },
  card: { backgroundColor: colors.panel, borderRadius: 20, padding: 16, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 12, backgroundColor: colors.raised, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.text, fontFamily: font.semibold, fontSize: 15, letterSpacing: -0.1 },
  primary: { backgroundColor: colors.amber },
  quiet: { backgroundColor: 'transparent', minHeight: 40, paddingHorizontal: 8 },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.88 },
  disabled: { opacity: 0.4 },
  chip: { minHeight: 40, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel, justifyContent: 'center' },
  chipActive: { borderColor: 'rgba(245,184,61,0.55)', backgroundColor: colors.amberSoft },
  chipText: { color: colors.text, fontFamily: font.medium, fontSize: 14 },
  input: { color: colors.text, fontFamily: font.regular, fontSize: 15, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, backgroundColor: colors.raised },
  track: { width: '100%', height: 4, flexShrink: 0, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.amber, borderRadius: 2 },
});
