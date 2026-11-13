import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

// Дизайн-система «Туман». Ночной город в тумане: глубокий сине-чёрный фон,
// слои поверхностей светлеют по мере приближения к пальцу, единственный тёплый
// акцент — янтарь фонаря в тумане. Акцент только для главного действия на экране.
export const colors = {
  bg: '#0A1016', // самый нижний слой: шторка, навигация
  panel: '#131C25', // карточка
  raised: '#1B2631', // поле ввода, тональная кнопка
  line: 'rgba(255,255,255,0.08)', // волосяная граница
  text: '#F2F5F7',
  muted: '#9AA8B3', // вторичный текст
  faint: '#66737D', // третичный: подписи, источники
  amber: '#F5B83D', // фонарь в тумане — главное действие и прогресс
  amberSoft: 'rgba(245,184,61,0.14)',
  teal: '#4CC2B5',
  coral: '#FF7A6B',
  green: '#5BC07A',
  glass: 'rgba(12,19,26,0.88)', // плавающий слой поверх карты
};

const font = { regular: 'Manrope_400Regular', medium: 'Manrope_500Medium', semibold: 'Manrope_600SemiBold', bold: 'Manrope_700Bold', heavy: 'Manrope_800ExtraBold' };

type ButtonKind = 'primary' | 'secondary' | 'quiet';

/** Отклик на касание сразу, а не после отпускания: лёгкое сжатие, как у физической кнопки. */
export function Button({ label, onPress, onLongPress, disabled, primary, kind, style }: { label: string; onPress: () => void; onLongPress?: () => void; disabled?: boolean; primary?: boolean; kind?: ButtonKind; style?: StyleProp<ViewStyle> }) {
  const variant: ButtonKind = kind ?? (primary ? 'primary' : 'secondary');
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} onLongPress={onLongPress} hitSlop={4} pressRetentionOffset={12}
    style={({ pressed }) => [u.button, variant === 'primary' && u.primary, variant === 'quiet' && u.quiet, pressed && u.pressed, disabled && u.disabled, style]}>
    <Text style={[u.buttonText, variant === 'primary' && { color: colors.bg }, variant === 'quiet' && { color: colors.amber }]}>{label}</Text>
  </Pressable>;
}
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} hitSlop={4} style={({ pressed }) => [u.chip, active && u.chipActive, pressed && u.pressed]}>
    <Text style={[u.chipText, active && { color: colors.amber }]}>{label}</Text>
  </Pressable>;
}
export function Field({ label, value, onChangeText, numeric = false }: { label: string; value: string; onChangeText: (text: string) => void; numeric?: boolean }) {
  return <View style={{ gap: 6 }}><Text style={u.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} autoCapitalize="none" placeholderTextColor={colors.faint} selectionColor={colors.amber} style={u.input} /></View>;
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
