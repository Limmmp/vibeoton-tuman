import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Interest, Member } from '../../src/match/matchGroup';
import { INTERESTS } from '../../src/match/matchGroup';

export type Preferences = { onboarded: boolean; role: string; interests: Interest[]; mapAddress?: string; view: '2d' | '3d'; checklist: string[]; members: Member[] };
const defaults: Preferences = { onboarded: false, role: 'Новый житель', interests: [], view: '2d', checklist: [], members: [] };
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(defaults);
  const [loaded, setLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem('tuman.preferences.v1').then(raw => {
      if (!mounted || !raw) return;
      const parsed = JSON.parse(raw);
      setPreferences({ ...defaults, ...parsed, interests: Array.isArray(parsed.interests) ? parsed.interests.filter((id: string) => id in INTERESTS) : [], members: Array.isArray(parsed.members) ? parsed.members : [], checklist: Array.isArray(parsed.checklist) ? parsed.checklist : [] });
    }).catch(() => { if (mounted) setStorageError('Не удалось прочитать настройки. Можно продолжить с настройками по умолчанию.'); }).finally(() => { if (mounted) setLoaded(true); });
    return () => { mounted = false; };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const timer = setTimeout(() => { AsyncStorage.setItem('tuman.preferences.v1', JSON.stringify(preferences)).catch(() => setStorageError('Не удалось сохранить настройки на устройстве.')); }, 200);
    return () => clearTimeout(timer);
  }, [preferences, loaded]);
  const update = (patch: Partial<Preferences>) => setPreferences(previous => ({ ...previous, ...patch }));
  return { preferences, loaded, update, storageError };
}
