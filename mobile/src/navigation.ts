export type Tab = 'Карта' | 'Компания' | 'Места' | 'История' | 'Профиль';
export type Overlay = 'quests' | 'settings' | 'developer' | 'helper' | 'inbox' | 'filters' | 'districts' | 'preview' | 'demo' | 'collection' | null;
export type Route = { tab: Tab; overlay: Overlay; selectedId: string | null; sheet: number; layer: string };
export type Navigation = { current: Route; history: Route[] };
export const initialNavigation: Navigation = { current: { tab: 'Карта', overlay: null, selectedId: null, sheet: 0, layer: 'Задания' }, history: [] };
export type NavigationAction = { type: 'push' | 'replace'; patch: Partial<Route> } | { type: 'back' } | { type: 'closeOverlay' };
export function navigationReducer(state: Navigation, action: NavigationAction): Navigation {
  if (action.type === 'back') {
    if (state.history.length) return { current: state.history[state.history.length - 1], history: state.history.slice(0, -1) };
    if (state.current.sheet !== 0) return { ...state, current: { ...state.current, sheet: 0 } };
    return state;
  }
  if (action.type === 'closeOverlay') {
    const current = { ...state.current, overlay: null };
    const history = state.history.filter(route => route.overlay === null);
    while (history.length && JSON.stringify(history[history.length - 1]) === JSON.stringify(current)) history.pop();
    return { current, history };
  }
  const current = { ...state.current, ...action.patch };
  if (Object.keys(current).every(key => current[key as keyof Route] === state.current[key as keyof Route])) return state;
  return { current, history: action.type === 'push' ? [...state.history.slice(-63), state.current] : state.history };
}
