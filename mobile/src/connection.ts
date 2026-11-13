import Constants from 'expo-constants';

// Expo's LAN address points at the same computer as the Vite map server.
const host = Constants.expoConfig?.hostUri?.split(':')[0];
export const defaultMapUrl = process.env.EXPO_PUBLIC_MAP_URL || `http://${host || 'localhost'}:5173`;

export function mapUrl(input: string): string {
  const url = new URL(input.trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Нужен адрес HTTP или HTTPS');
  url.searchParams.set('embedded', '1');
  return url.toString();
}
