import { useEffect, useMemo, useRef, useState } from 'react';
import { m } from '../i18n';
import { TYPES, TYPE_INFO } from '../lib/constants';
import { go } from '../lib/hash';
import { search } from '../lib/search';
import { norm } from '../lib/text';
import type { Artifact, ArtifactType } from '../lib/types';

interface Item {
  label: string;
  sub: string;
  glyph: string;
  type?: ArtifactType;
  run: () => void;
}
interface Group {
  label: string;
  items: Item[];
}

interface Props {
  arts: Artifact[];
  loaded: boolean;
  themeLabel: string;
  onToggleTheme: () => void;
  onClose: () => void;
}

export function CommandPalette({ arts, loaded, themeLabel, onToggleTheme, onClose }: Props) {
  const [pq, setPq] = useState('');
  const [pi, setPi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const groups = useMemo<Group[]>(() => {
    if (!loaded) return [];
    const nav = (h: string) => () => go(h);
    const pages: Item[] = [
      { ...m.palette.pages.browse, glyph: '⌂', run: nav('#/') },
      { ...m.palette.pages.whatsNew, glyph: '★', run: nav('#/new') },
      { ...m.palette.pages.start, glyph: '→', run: nav('#/start') },
      { label: themeLabel, sub: m.palette.actionSub, glyph: '◐', run: () => { onToggleTheme(); onClose(); } },
    ];
    const art = (a: Artifact): Item => ({
      label: a.name,
      sub: a.type === 'plugin' ? a.description : m.palette.artifactSub(a.plugin, a.description),
      glyph: TYPE_INFO[a.type].glyph,
      type: a.type,
      run: () => go(a.href),
    });
    if (!pq.trim()) {
      return [
        { label: m.palette.groupPages, items: pages },
        { label: m.palette.groupPlugins, items: arts.filter((a) => a.type === 'plugin').slice(0, 5).map(art) },
      ];
    }
    const n = norm(pq);
    const pageMatches = pages.filter((p) => norm(p.label).includes(n));
    const top = search(arts, pq).res.sort((a, b) => b.score - a.score).slice(0, 10).map((x) => x.a);
    const out: Group[] = [];
    for (const t of TYPES) {
      const items = top.filter((a) => a.type === t.id).map(art);
      if (items.length) out.push({ label: t.plural, items });
    }
    if (pageMatches.length) out.push({ label: m.palette.groupPages, items: pageMatches });
    return out;
  }, [arts, loaded, pq, themeLabel, onToggleTheme, onClose]);

  const flat = groups.flatMap((g) => g.items);
  const active = Math.min(pi, Math.max(0, flat.length - 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const n = flat.length;
        if (n) setPi((i) => (Math.min(i, n - 1) + (e.key === 'ArrowDown' ? 1 : -1) + n) % n);
      } else if (e.key === 'Enter') {
        const it = flat[active];
        if (it) {
          e.preventDefault();
          it.run();
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [flat, active, onClose]);

  let idx = 0;
  return (
    <div className="pal-backdrop" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={m.palette.dialogLabel} className="pal" onClick={(e) => e.stopPropagation()}>
        <div className="pal-input-row">
          <span aria-hidden="true" className="pal-prompt">›</span>
          <input
            ref={inputRef}
            value={pq}
            onChange={(e) => { setPq(e.target.value); setPi(0); }}
            role="combobox"
            aria-expanded="true"
            aria-controls="pal-list"
            aria-activedescendant={flat.length ? 'pal-' + active : undefined}
            aria-label={m.palette.inputLabel}
            placeholder={m.palette.placeholder}
            className="pal-input"
          />
          <kbd className="kbd">{m.palette.escKey}</kbd>
        </div>
        <div id="pal-list" role="listbox" aria-label={m.palette.resultsLabel} className="pal-list">
          {!loaded && <div className="pal-note">{m.palette.loading}</div>}
          {loaded && pq.trim() && !flat.length && (
            <div className="pal-empty">
              <span>{m.palette.noMatch(pq)}</span>
              <span className="muted small">{m.palette.noMatchHint}</span>
            </div>
          )}
          {groups.map((g) => (
            <div key={g.label} role="group" aria-label={g.label} className="pal-group">
              <div aria-hidden="true" className="pal-group-label">{g.label}</div>
              {g.items.map((it) => {
                const i = idx++;
                const isActive = i === active;
                return (
                  <div
                    key={g.label + it.label}
                    role="option"
                    id={'pal-' + i}
                    aria-selected={isActive}
                    className={'pal-item' + (isActive ? ' active' : '')}
                    onClick={it.run}
                    onMouseMove={() => i !== pi && setPi(i)}
                  >
                    <span aria-hidden="true" className="pal-glyph" style={{ color: it.type ? `var(--t-${it.type})` : 'var(--muted)' }}>{it.glyph}</span>
                    <span className={it.type ? 'mono' : ''} style={{ whiteSpace: 'nowrap', fontSize: 14 }}>{it.label}</span>
                    <span className="pal-sub">{it.sub}</span>
                    {isActive && <span aria-hidden="true" className="pal-enter">↵</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="pal-footer">
          <span>{m.palette.footerNavigate}</span><span>{m.palette.footerOpen}</span><span>{m.palette.footerClose}</span>
        </div>
      </div>
    </div>
  );
}
