// Клиент бэкенда «Тумана» (docs/backend-api.md). Токен хранится на телефоне, сеть — обычный fetch.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://176-53-248-123.sslip.io').replace(/\/$/, '');
const TOKEN_KEY = 'tuman.session.v1';

export type Avatar = { glyph: string; color: string };
export type User = { id: string; name: string; handle: string; avatar: Avatar };
export type Me = User & { email: string | null; friendCode: string; interests: string[]; providers: string[] };
export type Session = { token: string; expiresAt: string; user: Me };
export type Party = { id: string; name: string; ownerId: string; members: User[] };
export type BudgetMode = 'individual' | 'pooled' | 'fixed';
export type MeetingMember = { user: User; rsvp: 'invited' | 'going' | 'declined'; interests: string[]; noClimb: boolean; mood: string; budget?: number; enough: boolean };
export type Meeting = {
  id: string; title: string; ownerId: string; partyId: string | null; startsAt: string; endsAt: string;
  budgetMode: BudgetMode; fixedBudget: number | null; indoorOnly: boolean; status: 'planning' | 'chosen' | 'cancelled';
  place: { id: string; name?: string; lat?: number; lon?: number; address?: string } | null;
  budget: { perPerson: number; total: number; label: string; shortfall: { userId: string; missing: number }[] };
  members: MeetingMember[]; votes: Record<string, { score: number; count: number }>; myVotes: Record<string, number>;
};
export type Suggestion = { place: { id: string; name: string; lat: number; lon: number; address?: string }; price: number | null; reason: string; flags: string[]; travel: { name: string; minutes: number }[]; score: number };
export type Health = { ok: boolean; providers: string[]; devLogin: boolean };

export class ApiError extends Error {
  status: number; code: string;
  constructor(status: number, code: string, message: string) { super(message); this.status = status; this.code = code; }
}

let token: string | null = null;
export const loadToken = async () => (token = await AsyncStorage.getItem(TOKEN_KEY));
export const saveToken = async (value: string | null) => { token = value; if (value) await AsyncStorage.setItem(TOKEN_KEY, value); else await AsyncStorage.removeItem(TOKEN_KEY); };

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(API_URL + path, { method, signal: controller.signal, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(res.status, data.error || 'http', data.message || `Сервер ответил ${res.status}`);
    return data as T;
  } catch (problem) {
    if (problem instanceof ApiError) throw problem;
    throw new ApiError(0, 'network', (problem as Error).name === 'AbortError' ? 'Сервер долго не отвечает. Проверьте интернет.' : 'Нет связи с сервером. Проверьте интернет.');
  } finally { clearTimeout(timer); }
}

export const api = {
  health: () => request<Health>('GET', '/health'),
  register: (email: string, password: string, name: string) => request<Session>('POST', '/auth/email/register', { email, password, name }),
  login: (email: string, password: string) => request<Session>('POST', '/auth/email/login', { email, password }),
  devLogin: (name: string) => request<Session>('POST', '/auth/dev', { name }),
  social: (provider: string, payload: Record<string, unknown>) => request<Session>('POST', `/auth/${provider}`, payload),
  logout: () => request<{ ok: boolean }>('POST', '/auth/logout'),
  me: () => request<Me>('GET', '/me'),
  updateMe: (patch: Partial<Pick<Me, 'name' | 'handle' | 'avatar' | 'interests'>>) => request<Me>('PATCH', '/me', patch),
  friends: () => request<{ friends: User[]; incoming: User[]; outgoing: User[] }>('GET', '/friends'),
  search: (q: string) => request<{ users: User[] }>('GET', `/users/search?q=${encodeURIComponent(q)}`),
  addFriend: (code: string) => request<{ status: 'pending' | 'accepted' }>('POST', '/friends/requests', { code }),
  answerFriend: (userId: string, action: 'accept' | 'decline') => request<{ ok: boolean }>('POST', `/friends/requests/${userId}/${action}`),
  removeFriend: (userId: string) => request<{ ok: boolean }>('DELETE', `/friends/${userId}`),
  parties: () => request<{ parties: Party[] }>('GET', '/parties'),
  createParty: (name: string, memberIds: string[]) => request<Party>('POST', '/parties', { name, memberIds }),
  meetings: () => request<{ meetings: Meeting[] }>('GET', '/meetings'),
  createMeeting: (input: { title: string; startsAt: string; endsAt: string; budgetMode: BudgetMode; fixedBudget?: number; myBudget?: number; indoorOnly?: boolean; partyId?: string; memberIds?: string[] }) => request<Meeting>('POST', '/meetings', input),
  meeting: (id: string) => request<Meeting>('GET', `/meetings/${id}`),
  rsvp: (id: string, patch: { rsvp?: 'going' | 'declined'; budget?: number; interests?: string[]; noClimb?: boolean; mood?: 'calm' | 'active' }) => request<Meeting>('POST', `/meetings/${id}/rsvp`, patch),
  suggest: (id: string, weatherBad?: boolean) => request<{ budget: Meeting['budget']; hints: string[]; results: Suggestion[] }>('POST', `/meetings/${id}/suggest`, { weatherBad }),
  vote: (id: string, placeId: string, value: 1 | -1 | 0) => request<Meeting>('POST', `/meetings/${id}/votes`, { placeId, value }),
  choose: (id: string, placeId: string) => request<Meeting>('POST', `/meetings/${id}/choose`, { placeId }),
  cancel: (id: string) => request<Meeting>('PATCH', `/meetings/${id}`, { status: 'cancelled' }),
};
