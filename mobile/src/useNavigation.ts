import { useCallback, useRef, useState } from 'react';
import { initialNavigation, navigationReducer, type NavigationAction } from './navigation';

export function useNavigation() {
  const current = useRef(initialNavigation);
  const [navigation, setNavigation] = useState(initialNavigation);
  const dispatch = useCallback((action: NavigationAction) => {
    const next = navigationReducer(current.current, action);
    const changed = next !== current.current;
    current.current = next;
    if (changed) setNavigation(next);
    return changed;
  }, []);
  return { navigation, dispatch };
}
