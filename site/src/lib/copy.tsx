import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { m } from '../i18n';

type CopyStatus = 'copied' | 'failed';

interface CopyApi {
  copy: (key: string, text: string) => void;
  status: (key: string) => CopyStatus | undefined;
  /** Text for the aria-live region. */
  live: string;
}

const Ctx = createContext<CopyApi | null>(null);

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;opacity:0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export function CopyProvider({ children }: { children: ReactNode }) {
  const [copied, setCopied] = useState<Record<string, CopyStatus>>({});
  const [live, setLive] = useState('');
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const copy = useCallback((key: string, text: string) => {
    const done = (ok: boolean) => {
      clearTimeout(timers.current[key]);
      setCopied((s) => ({ ...s, [key]: ok ? 'copied' : 'failed' }));
      setLive(ok ? m.copy.liveCopied(text) : m.copy.liveFailed);
      timers.current[key] = setTimeout(
        () =>
          setCopied((s) => {
            const { [key]: _gone, ...rest } = s;
            return rest;
          }),
        1800,
      );
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => done(true), () => done(legacyCopy(text)));
    else done(legacyCopy(text));
  }, []);

  const api = useMemo<CopyApi>(() => ({ copy, status: (k) => copied[k], live }), [copy, copied, live]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useCopy(): CopyApi {
  const c = useContext(Ctx);
  if (!c) throw new Error('useCopy must be used inside <CopyProvider>');
  return c;
}
