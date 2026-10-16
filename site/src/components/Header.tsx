import type { RefObject } from 'react';
import { m } from '../i18n';
import type { Theme } from '../lib/hooks';

interface Props {
  view: string;
  githubUrl: string;
  q: string;
  wide: boolean;
  narrow: boolean;
  theme: Theme;
  searchRef: RefObject<HTMLInputElement | null>;
  onQuery: (q: string) => void;
  onClear: () => void;
  onOpenPalette: () => void;
  onToggleTheme: () => void;
}

const NAV: [string, string, string][] = [
  ['#/', m.nav.browse, 'home'],
  ['#/new', m.nav.whatsNew, 'new'],
  ['#/start', m.nav.start, 'start'],
];

export function Header({ view, githubUrl, q, wide, narrow, theme, searchRef, onQuery, onClear, onOpenPalette, onToggleTheme }: Props) {
  const mac = /Mac|iPhone|iPad/.test(navigator.platform || '');
  const next = theme === 'dark' ? 'light' : 'dark';
  return (
    <header className="site-header">
      <div className="container header-row">
        <a href="#/" className="brand" aria-label={m.header.brandAria}>
          <span aria-hidden="true" className="brand-mark">{m.header.brandMark}</span>
          <span className="brand-name">
            {m.header.brandPrefix} <span className="muted">{m.header.brandSuffix}</span>
          </span>
        </a>
        {wide && (
          <nav aria-label={m.nav.label} className="main-nav">
            {NAV.map(([href, label, v]) => (
              <a key={href} href={href} aria-current={view === v ? 'page' : undefined} className={view === v ? 'active' : ''}>
                {label}
              </a>
            ))}
          </nav>
        )}
        <div role="search" className="search-box" style={{ flex: narrow ? '1 1 100%' : '1 1 320px', order: narrow ? 3 : 0 }}>
          <span aria-hidden="true" className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            value={q}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={m.header.searchPlaceholder}
            aria-label={m.header.searchLabel}
            className="search-input focus-ring"
          />
          {q ? (
            <button type="button" className="search-clear" onClick={onClear} aria-label={m.header.clearSearch}>
              {m.common.clear}
            </button>
          ) : (
            <kbd aria-hidden="true" className="search-kbd">/</kbd>
          )}
        </div>
        <div className="header-actions">
          <button type="button" className="btn-ghost mono" onClick={onOpenPalette} aria-label={m.header.openPalette} aria-haspopup="dialog">
            {mac ? m.header.paletteKeyMac : m.header.paletteKeyOther}
          </button>
          <button type="button" className="btn-ghost" onClick={onToggleTheme} aria-label={m.theme.switchTo[next]}>
            {m.theme.button[next]}
          </button>
          <a href={githubUrl} target="_blank" rel="noopener" className="btn-ghost link">
            {m.header.github}
          </a>
        </div>
      </div>
    </header>
  );
}
