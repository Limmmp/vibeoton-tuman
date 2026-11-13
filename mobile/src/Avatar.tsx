import React from 'react';
import { Text, View } from 'react-native';
import { Glyph } from './glyphs';
import type { Avatar as AvatarData } from './api';

/** Аватар: значок-образ города на тонированном круге в цвете пользователя. */
export function Avatar({ avatar, size = 40, ring = false, label }: { avatar?: AvatarData | null; size?: number; ring?: boolean; label?: string }) {
  const color = avatar?.color ?? '#9AA8B3';
  return <View accessibilityRole="image" accessibilityLabel={label} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '24', borderWidth: ring ? 2 : 1, borderColor: ring ? color : color + '55', alignItems: 'center', justifyContent: 'center' }}>
    {avatar ? <Glyph name={avatar.glyph} size={size * 0.56} color={color} stroke={size < 32 ? 2 : 1.75} /> : <Text style={{ color, fontFamily: 'Manrope_800ExtraBold', fontSize: size * 0.4 }}>{label?.slice(0, 1).toUpperCase() ?? '?'}</Text>}
  </View>;
}

/** Стопка аватаров с наложением: компания в одну строку. */
export function AvatarStack({ avatars, size = 28, max = 5 }: { avatars: (AvatarData | null | undefined)[]; size?: number; max?: number }) {
  const shown = avatars.slice(0, max);
  return <View style={{ flexDirection: 'row' }}>
    {shown.map((a, i) => <View key={i} style={{ marginLeft: i ? -size * 0.3 : 0, borderRadius: size / 2, borderWidth: 2, borderColor: '#131C25' }}><Avatar avatar={a} size={size} /></View>)}
    {avatars.length > max && <View style={{ marginLeft: -size * 0.3, width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, backgroundColor: '#1B2631', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#131C25' }}><Text style={{ color: '#9AA8B3', fontFamily: 'Manrope_700Bold', fontSize: 11 }}>+{avatars.length - max}</Text></View>}
  </View>;
}
