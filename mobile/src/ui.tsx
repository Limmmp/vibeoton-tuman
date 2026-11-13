import React, { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

export const colors = { bg: '#0F1720', panel: '#172633', line: '#304453', text: '#EDF1F4', muted: '#A4B4BF', amber: '#F5B83D', teal: '#3FB8AF', coral: '#FF7A6B', green: '#5BC07A' };
export function Button({ label, onPress, disabled, primary }: { label: string; onPress: () => void; disabled?: boolean; primary?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress} style={[u.button, primary && u.primary, disabled && { opacity: 0.4 }]}><Text style={[u.buttonText, primary && { color: colors.bg }]}>{label}</Text></Pressable>;
}
export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={onPress} style={[u.chip, active && { borderColor: colors.amber, backgroundColor: '#3A3325' }]}><Text style={u.text}>{label}</Text></Pressable>;
}
export function Field({ label, value, onChangeText, numeric = false }: { label: string; value: string; onChangeText: (text: string) => void; numeric?: boolean }) {
  return <View style={u.stack}><Text style={u.muted}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'numeric' : 'default'} autoCapitalize="none" style={u.input} /></View>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={u.card}>{children}</View>; }
export function Bar({ value }: { value: number }) { return <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(value * 100) }} style={u.track}><View style={[u.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} /></View>; }
export const u = StyleSheet.create({
  text: { color: colors.text, fontFamily: 'Manrope_400Regular', fontSize: 14, lineHeight: 21 }, muted: { color: colors.muted, fontFamily: 'Manrope_400Regular', fontSize: 12, lineHeight: 19 }, title: { color: colors.text, fontSize: 25, fontFamily: 'RussoOne_400Regular' }, heading: { color: colors.text, fontSize: 19, fontFamily: 'Manrope_600SemiBold' }, eyebrow: { color: colors.amber, fontFamily: 'Manrope_600SemiBold', fontSize: 10, letterSpacing: 1.8 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, stack: { gap: 8 }, card: { backgroundColor: colors.panel, borderRadius: 18, padding: 16, gap: 10, borderWidth: 1, borderColor: colors.line },
  button: { minHeight: 44, paddingHorizontal: 15, paddingVertical: 12, backgroundColor: '#283C4B', borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: colors.text, fontSize: 13, fontWeight: '600' }, primary: { backgroundColor: colors.amber },
  chip: { minHeight: 44, padding: 11, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.panel }, input: { color: colors.text, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  track: { height: 5, backgroundColor: colors.line, borderRadius: 3, overflow: 'hidden' }, fill: { height: 5, backgroundColor: colors.amber },
});
