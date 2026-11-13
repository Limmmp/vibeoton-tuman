import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, loadToken, saveToken, type Health, type Me, type Session } from './api';

type SessionState = {
  me: Me | null;
  loading: boolean; // читаем сохранённый токен
  health: Health | null; // какие способы входа включены на сервере
  skipped: boolean; // пользователь выбрал «без аккаунта»
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  skip: () => void;
  askAuth: () => void; // снова показать экран входа
  setMe: (me: Me) => void;
};

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<Health | null>(null);
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    let live = true;
    api.health().then(h => { if (live) setHealth(h); }).catch(() => {});
    loadToken().then(async token => {
      if (!token) return;
      try { const user = await api.me(); if (live) setMe(user); }
      catch (problem) { if (problem instanceof ApiError && problem.status === 401) await saveToken(null); }
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);
  const signIn = useCallback(async (session: Session) => { await saveToken(session.token); setMe(session.user); setSkipped(false); }, []);
  const signOut = useCallback(async () => { try { await api.logout(); } catch {} await saveToken(null); setMe(null); }, []);
  const value = useMemo(() => ({ me, loading, health, skipped, signIn, signOut, skip: () => setSkipped(true), askAuth: () => setSkipped(false), setMe }), [me, loading, health, skipped, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const value = useContext(Ctx);
  if (!value) throw new Error('useSession вне SessionProvider');
  return value;
}
