import type { Place } from '../data/place.ts';
import { INTERESTS, matchGroup, type Interest, type MatchOutput } from '../match/matchGroup.ts';
import { budgetLabel, planBudget, type BudgetMode } from './budget.ts';

export type MeetingPreferences = {
  budget: number; start: string; end: string; desiredPlaceId: string | null; interests: Interest[];
};
export type MeetingMember = { id: string; name: string; preferences: MeetingPreferences | null };
export type GroupPlan = { ownerId: string; mode: BudgetMode; fixed: number; placeId: string | null; meetingAt: string | null };
export type MeetingView = {
  ownerId: string; mode: BudgetMode; fixed: number; place: Place | null; meetingAt: string | null;
  mine: MeetingPreferences | null;
  members: { id: string; name: string; ready: boolean; desiredPlace: Place | null; start: string | null; end: string | null }[];
  budget: { label: string; perPerson: number; shortfall: string[] };
  output: MatchOutput;
};

export function validatePreferences(raw: unknown, places: Place[]): MeetingPreferences {
  if (!raw || typeof raw !== 'object') throw Error('Заполни бюджет и время встречи');
  const p = raw as Partial<MeetingPreferences>;
  if (!Number.isSafeInteger(p.budget) || p.budget! < 0 || p.budget! > 1_000_000) throw Error('Бюджет: целое число от 0 до 1 000 000 ₽');
  const start = typeof p.start === 'string' ? Date.parse(p.start) : NaN;
  const end = typeof p.end === 'string' ? Date.parse(p.end) : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86400000) throw Error('Укажи время начала и окончания в пределах суток');
  const desiredPlaceId = p.desiredPlaceId || null;
  if (desiredPlaceId && !places.some(place => place.id === desiredPlaceId)) throw Error('Желаемое место не найдено в каталоге');
  if (!Array.isArray(p.interests) || p.interests.length > 5 || p.interests.some(key => !Object.hasOwn(INTERESTS, key))) throw Error('Выбери до пяти интересов');
  return { budget: p.budget!, start: new Date(start).toISOString(), end: new Date(end).toISOString(), desiredPlaceId, interests: [...new Set(p.interests)] };
}

/** Один и тот же расчёт для всех участников группы; личные суммы не попадают в список участников. */
export function meetingView(plan: GroupPlan, members: MeetingMember[], selfId: string, places: Place[]): MeetingView {
  const ready = members.filter((m): m is MeetingMember & { preferences: MeetingPreferences } => !!m.preferences);
  const budget = planBudget(plan.mode, ready.map(m => ({ userId: m.id, budget: m.preferences.budget })), plan.fixed);
  const allReady = ready.length === members.length && ready.length > 0;
  const allowedBudget = plan.mode !== 'fixed' || budget.shortfall.length === 0;
  const input = ready.map(m => ({ name: m.name, interests: m.preferences.interests, budget: budget.effective.get(m.id)!, window: { start: m.preferences.start, end: m.preferences.end } }));
  const matched = allReady && allowedBudget ? matchGroup({ members: input, places }) : {
    window: null, results: [], hints: [allReady ? 'Для фиксированной суммы не всем хватает бюджета.' : 'Ждём анкеты всех участников группы.'],
  };
  // Предпочтения влияют на порядок только среди мест, прошедших ограничения алгоритма.
  const desired = new Map<string, number>();
  for (const m of ready) if (m.preferences.desiredPlaceId) desired.set(m.preferences.desiredPlaceId, (desired.get(m.preferences.desiredPlaceId) ?? 0) + 1);
  const ranked = allReady && allowedBudget ? matchGroup({ members: input, places: places.filter(p => desired.has(p.id)) }).results : [];
  const results = [...new Map([...ranked, ...matched.results].map(r => [r.place.id, r])).values()]
    .sort((a, b) => (desired.get(b.place.id) ?? 0) - (desired.get(a.place.id) ?? 0) || b.score - a.score).slice(0, 3);
  const chosen = plan.placeId && allReady && allowedBudget ? matchGroup({ members: input, places: places.filter(p => p.id === plan.placeId) }).results[0]?.place ?? null : null;
  const at = plan.meetingAt && matched.window && Date.parse(plan.meetingAt) >= Date.parse(matched.window.start) && Date.parse(plan.meetingAt) < Date.parse(matched.window.end) ? plan.meetingAt : null;
  return {
    ownerId: plan.ownerId, mode: plan.mode, fixed: plan.fixed, place: chosen, meetingAt: at,
    mine: members.find(m => m.id === selfId)?.preferences ?? null,
    members: members.map(m => ({ id: m.id, name: m.name, ready: !!m.preferences, desiredPlace: places.find(p => p.id === m.preferences?.desiredPlaceId) ?? null, start: m.preferences?.start ?? null, end: m.preferences?.end ?? null })),
    budget: { label: budgetLabel(budget), perPerson: budget.perPerson, shortfall: budget.shortfall.map(m => m.userId) },
    output: { ...matched, results },
  };
}
