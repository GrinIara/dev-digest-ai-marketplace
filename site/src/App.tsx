import { useCallback, useEffect, useRef, useState } from 'react';
import { CommandPalette } from './components/CommandPalette';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { m } from './i18n';
import { emptyFilters } from './lib/catalog';
import { CopyProvider, useCopy } from './lib/copy';
import { setHash, useHash } from './lib/hash';
import { useTheme, useWidth } from './lib/hooks';
import { useIndex } from './lib/useIndex';
import { homeHash, parseRoute } from './lib/route';
import { Detail } from './views/Detail';
import { Home } from './views/Home';
import { NotFound } from './views/NotFound';
import { Releases } from './views/Releases';
import { Start } from './views/Start';

function Shell() {
  const hash = useHash();
  const w = useWidth();
  const [theme, toggleTheme] = useTheme();
  const { live } = useCopy();
  const [index, retry] = useIndex();
  const { catalog } = index;
  const loaded = index.status === 'ready';
  const [pal, setPal] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const lastFocus = useRef<Element | null>(null);

  const route = parseRoute(hash);
  const detail = route.view === 'detail' ? catalog.byId[route.id] : undefined;
  const view = route.view === 'detail' && !detail && loaded ? '404' : route.view;
  const wide = w >= 900;
  const narrow = w < 860;
  const q = route.view === 'home' ? route.q : '';
  const f = route.view === 'home' ? route.f : emptyFilters();

  const openPal = useCallback(() => {
    lastFocus.current = document.activeElement;
    setPal(true);
  }, []);
  const closePal = useCallback(() => {
    setPal(false);
    (lastFocus.current as HTMLElement | null)?.focus?.();
  }, []);

  // New page: scroll to top and close overlays. Query-only changes (filters, search) keep scroll.
  const pathKey = hash.replace(/^#/, '').split('?')[0];
  useEffect(() => {
    window.scrollTo(0, 0);
    setPal(false);
  }, [pathKey]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        pal ? closePal() : openPal();
        return;
      }
      if (pal) return;
      const tag = (e.target as HTMLElement).tagName?.toLowerCase();
      if (e.key === '/' && !['input', 'textarea', 'select'].includes(tag) && !(e.target as HTMLElement).isContentEditable) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [pal, openPal, closePal]);

  const onQuery = (v: string) => {
    if (route.view !== 'home') location.hash = homeHash({ q: v, f, sort: '' });
    else setHash(homeHash({ q: v, f, sort: route.sort }), 'replace');
  };
  const onClear = () => {
    if (route.view === 'home') setHash(homeHash({ q: '', f, sort: route.sort }), 'push');
    searchRef.current?.focus();
  };

  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <div className="app">
      <a href="#main" className="skip-link" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>
        {m.a11y.skipToContent}
      </a>
      <div aria-live="polite" role="status" className="sr-only">{live}</div>
      <Header
        view={view}
        githubUrl={catalog.meta.github || 'https://github.com'}
        q={q}
        wide={wide}
        narrow={narrow}
        theme={theme}
        searchRef={searchRef}
        onQuery={onQuery}
        onClear={onClear}
        onOpenPalette={openPal}
        onToggleTheme={toggleTheme}
      />
      <main id="main" tabIndex={-1} className="container main">
        {index.status === 'error' && (
          <div role="alert" className="empty">
            <h2 className="h3">{m.errors.loadTitle}</h2>
            <p className="muted" style={{ margin: 0 }}>{index.message}</p>
            <button type="button" className="btn-primary" onClick={retry}>{m.errors.retry}</button>
          </div>
        )}
        {index.status !== 'error' && route.view === 'detail' && !detail && !loaded && <div aria-busy="true" className="skeleton" />}
        {index.status !== 'error' && route.view === 'home' && <Home catalog={catalog} q={route.q} f={route.f} sort={route.sort} loaded={loaded} narrow={narrow} />}
        {index.status !== 'error' && route.view === 'detail' && detail && <Detail key={detail.id} a={detail} catalog={catalog} wide={wide} />}
        {index.status !== 'error' && route.view === 'new' && <Releases catalog={catalog} plugin={route.plugin} wide={wide} />}
        {index.status !== 'error' && route.view === 'start' && <Start catalog={catalog} />}
        {index.status !== 'error' && view === '404' && <NotFound />}
      </main>
      <Footer commit={catalog.meta.commit} />
      {pal && <CommandPalette arts={catalog.arts} loaded={loaded} themeLabel={m.theme.switchTo[nextTheme]} onToggleTheme={toggleTheme} onClose={closePal} />}
    </div>
  );
}

export default function App() {
  return (
    <CopyProvider>
      <Shell />
    </CopyProvider>
  );
}

