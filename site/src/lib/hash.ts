import { useSyncExternalStore } from 'react';

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  addEventListener('hashchange', cb);
  addEventListener('popstate', cb);
  return () => {
    listeners.delete(cb);
    removeEventListener('hashchange', cb);
    removeEventListener('popstate', cb);
  };
}

export const useHash = (): string => useSyncExternalStore(subscribe, () => location.hash || '#/');

/** Update the hash without adding (replace) or with adding (push) a history entry. */
export function setHash(h: string, mode: 'push' | 'replace'): void {
  history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', h);
  notify();
}

/** Navigate like a link click, even when the hash is already current. */
export function go(h: string): void {
  if (location.hash === h) {
    notify();
    window.scrollTo(0, 0);
  } else location.hash = h;
}
