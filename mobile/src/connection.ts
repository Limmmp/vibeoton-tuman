import Constants from 'expo-constants';

// Опубликованный движок карты (GitHub Pages, автодеплой из main). Работает без ноутбука и по HTTPS.
export const PAGES_MAP_URL = 'https://limmmp.github.io/vibeoton-tuman/';

// Локальный Vite-сервер движка на том же компьютере, что и Metro (для разработки самой карты).
const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const localMapUrl = `http://${host || 'localhost'}:5173`;

// EXPO_PUBLIC_MAP_URL — явный адрес; EXPO_PUBLIC_MAP_SOURCE=local — локальный сервер; иначе Pages.
export const defaultMapUrl =
  process.env.EXPO_PUBLIC_MAP_URL || (process.env.EXPO_PUBLIC_MAP_SOURCE === 'local' ? localMapUrl : PAGES_MAP_URL);

export function mapUrl(input: string): string {
  const url = new URL(input.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Нужен адрес HTTP или HTTPS');
  url.searchParams.set('embedded', '1');
  return url.toString();
}
