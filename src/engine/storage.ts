// Локальное сохранение. Все обращения в try/catch: в приватном режиме или в WebView
// без доступа к хранилищу приложение продолжит работать без сохранений.

const PREFIX = "tuman:";

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** Отложенный вызов: не пишем в хранилище на каждый шаг. */
export function debounced<A extends unknown[]>(fn: (...args: A) => void, ms = 1500) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...args: A) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
