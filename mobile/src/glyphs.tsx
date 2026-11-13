import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Единый набор иконок «Тумана»: сетка 24, линия 1,75, скруглённые концы и стыки.
// Значки аватаров — образы Владивостока: маяк, чайка, якорь, волна, сопка, кот, тигр, мост, компас.

type Shape = { d?: string[]; circles?: [number, number, number, boolean?][]; rects?: [number, number, number, number, number][] };

const GLYPHS: Record<string, Shape> = {
  // вкладки
  map: { d: ['M9 4 3 6.2v13.8l6-2.2 6 2.2 6-2.2V4l-6 2.2L9 4Z', 'M9 4v13.8', 'M15 6.2V20'] },
  people: { circles: [[9, 8, 3.2], [17, 9.2, 2.4]], d: ['M3 19.5c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5', 'M15.6 14.4c2.9.1 5.4 1.8 5.4 5.1'] },
  pin: { d: ['M12 21s7-6.1 7-11.8a7 7 0 1 0-14 0C5 14.9 12 21 12 21Z'], circles: [[12, 9.2, 2.5]] },
  user: { circles: [[12, 8, 4]], d: ['M4 21c0-4.2 3.6-6.5 8-6.5s8 2.3 8 6.5'] },
  // интерфейс
  plus: { d: ['M12 5v14', 'M5 12h14'] },
  check: { d: ['m5 12.5 4.5 4.5L19 7.5'] },
  close: { d: ['m6 6 12 12', 'M18 6 6 18'] },
  chevronRight: { d: ['m9 5 7 7-7 7'] },
  chevronLeft: { d: ['m15 5-7 7 7 7'] },
  copy: { rects: [[8, 8, 12, 12, 2.5]], d: ['M16 8V6.5A2.5 2.5 0 0 0 13.5 4h-7A2.5 2.5 0 0 0 4 6.5v7A2.5 2.5 0 0 0 6.5 16H8'] },
  share: { d: ['M12 4v11', 'm7.5 8.5 4.5-4.5 4.5 4.5', 'M5 13v4.5A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5V13'] },
  mail: { rects: [[3, 5.5, 18, 13, 2.5]], d: ['m3.5 7 8.5 6 8.5-6'] },
  calendar: { rects: [[3.5, 5, 17, 15.5, 2.5]], d: ['M3.5 10h17', 'M8 3v4', 'M16 3v4'] },
  wallet: { rects: [[3, 6, 18, 13, 2.5]], d: ['M3 10h18', 'M16 14.5h2'] },
  route: { circles: [[6, 18, 2.2], [18, 6, 2.2]], d: ['M8.2 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.8'] },
  menu: { d: ['M4 7h16', 'M4 12h10', 'M4 17h16'] },
  qr: { rects: [[4, 4, 6, 6, 1], [14, 4, 6, 6, 1], [4, 14, 6, 6, 1]], d: ['M14 14h2v2', 'M20 14v6h-4', 'M14 18v2'] },
  // аватары
  lighthouse: { d: ['M9.2 21 10.4 9h3.2l1.2 12Z', 'M9.6 9V5.5h4.8V9', 'M9 5.5 12 3l3 2.5', 'M6 21h12', 'M4.5 6.5 7.5 7.5', 'M19.5 6.5l-3 1', 'M10.1 14.5h3.8'] },
  gull: { d: ['M2.5 11c2.6-2.7 5.6-2.7 9.5 1.5 3.9-4.2 6.9-4.2 9.5-1.5', 'M12 12.5v2'] },
  anchor: { circles: [[12, 5, 2]], d: ['M12 7v14', 'M8 11h8', 'M4.5 13.5c0 4.3 3.4 7.5 7.5 7.5s7.5-3.2 7.5-7.5', 'M3 14.5l1.5-1.5 1.5 1.5', 'M18 14.5l1.5-1.5 1.5 1.5'] },
  wave: { d: ['M2.5 9.5c1.6 1.6 3.2 1.6 4.8 0s3.2-1.6 4.7 0 3.2 1.6 4.7 0 3.2-1.6 4.8 0', 'M2.5 15c1.6 1.6 3.2 1.6 4.8 0s3.2-1.6 4.7 0 3.2 1.6 4.7 0 3.2-1.6 4.8 0'] },
  hill: { d: ['M2 19.5 8.5 9l4 6 3-4.2 6.5 8.7Z', 'M7 11.2 8.5 9l1.6 2.4'] },
  cat: { d: ['M5 10.5 5.8 4l4 3.2h4.4l4-3.2.8 6.5V13a7 6.5 0 0 1-14 0Z', 'M10.5 15.5 12 16.5l1.5-1'], circles: [[9.5, 12, 0.9, true], [14.5, 12, 0.9, true]] },
  tiger: { circles: [[12, 13, 7.2], [9.6, 12.2, 0.9, true], [14.4, 12.2, 0.9, true]], d: ['M6.6 8.2 5.4 4.6l4 2', 'M17.4 8.2l1.2-3.6-4 2', 'M12 5.8v2.6', 'M7 12.5l1.6.6', 'M17 12.5l-1.6.6', 'M10.6 16.2 12 17l1.4-.8'] },
  star: { d: ['m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9-4.3-4.1 5.9-.8Z'] },
  bridge: { d: ['M2 16.5h20', 'M7 16.5 5 4.5', 'M7 16.5 9 4.5', 'M17 16.5l-2-12', 'M17 16.5l2-12', 'M6 6 2 16.5', 'M8 6l4.5 10.5', 'M16 6l-4.5 10.5', 'M18 6l4 10.5'] },
  compass: { circles: [[12, 12, 9]], d: ['M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6Z'] },
};

export const AVATAR_GLYPHS = ['lighthouse', 'gull', 'anchor', 'wave', 'hill', 'cat', 'tiger', 'star', 'bridge', 'compass'] as const;
export const AVATAR_COLORS = ['#F5B83D', '#4CC2B5', '#FF7A6B', '#7C9CFF', '#5BC07A', '#C58BF2', '#F2A65A', '#9AA8B3'] as const;

export function Glyph({ name, size = 24, color = '#F2F5F7', stroke = 1.75 }: { name: string; size?: number; color?: string; stroke?: number }) {
  const g = GLYPHS[name] ?? GLYPHS.star;
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessible={false}>
    {g.rects?.map(([x, y, w, h, r], i) => <Rect key={`r${i}`} x={x} y={y} width={w} height={h} rx={r} stroke={color} strokeWidth={stroke} />)}
    {g.circles?.map(([cx, cy, r, fill], i) => <Circle key={`c${i}`} cx={cx} cy={cy} r={r} stroke={fill ? 'none' : color} fill={fill ? color : 'none'} strokeWidth={stroke} />)}
    {g.d?.map((d, i) => <Path key={`p${i}`} d={d} stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />)}
  </Svg>;
}

/** Знаки соцсетей для кнопок входа: фирменный цвет кружка и упрощённый знак. */
export function ProviderMark({ provider, size = 28 }: { provider: 'vk' | 'telegram' | 'yandex' | 'google' | 'email'; size?: number }) {
  const bg = { vk: '#0077FF', telegram: '#2AABEE', yandex: '#FC3F1D', google: '#FFFFFF', email: '#1B2631' }[provider];
  return <Svg width={size} height={size} viewBox="0 0 28 28" accessible={false}>
    <Circle cx={14} cy={14} r={14} fill={bg} />
    {provider === 'vk' && <Path d="M7 10h2.6c.2 3.2 1.6 4.6 2.7 4.9V10h2.4v2.8c1.1-.1 2.2-1.4 2.6-2.8h2.4c-.4 1.8-1.8 3.2-2.8 3.8 1 .5 2.6 1.7 3.2 4.2h-2.6c-.5-1.6-1.7-2.8-2.8-2.9V18h-.3C9.6 18 7.2 15 7 10Z" fill="#fff" />}
    {provider === 'telegram' && <Path d="m6.5 13.6 13.6-5.3c.6-.2 1.2.2 1 1.1l-2.3 10.9c-.2.8-.7 1-1.4.6l-3.5-2.6-1.7 1.6c-.2.2-.4.3-.8.3l.3-3.6 6.5-5.9c.3-.3-.1-.4-.4-.2l-8 5-3.4-1.1c-.8-.2-.8-.8.1-1.1Z" fill="#fff" />}
    {provider === 'yandex' && <Path d="M15.3 21h2.2V7h-3.2c-3.2 0-4.9 1.6-4.9 4.1 0 2 1 3.2 2.7 4.4L9.2 21h2.4l3.3-4.9-1.1-.8c-1.4-.9-2-1.6-2-3.2 0-1.4 1-2.4 2.8-2.4h.7V21Z" fill="#fff" />}
    {provider === 'google' && <Path d="M21.6 14.2c0-.6 0-1.1-.1-1.6H14v3h4.3a3.7 3.7 0 0 1-1.6 2.4v2h2.6c1.5-1.4 2.3-3.4 2.3-5.8ZM14 22c2.2 0 4-.7 5.3-1.9l-2.6-2a4.8 4.8 0 0 1-7.1-2.5H6.9v2.1A8 8 0 0 0 14 22Zm-4.4-6.4a4.8 4.8 0 0 1 0-3.1v-2.1H6.9a8 8 0 0 0 0 7.3l2.7-2.1ZM14 9.2c1.2 0 2.3.4 3.2 1.2l2.4-2.4A8 8 0 0 0 6.9 10.4l2.7 2.1A4.8 4.8 0 0 1 14 9.2Z" fill="#4285F4" />}
    {provider === 'email' && <><Rect x={7} y={9} width={14} height={10} rx={2} stroke="#F2F5F7" strokeWidth={1.6} fill="none" /><Path d="m7.6 10 6.4 4.6 6.4-4.6" stroke="#F2F5F7" strokeWidth={1.6} fill="none" strokeLinecap="round" /></>}
  </Svg>;
}
