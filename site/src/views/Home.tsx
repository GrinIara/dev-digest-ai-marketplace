import { useEffect, useMemo, useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { SecBadges, TypeBadge } from '../components/Badges';
import { m, rich } from '../i18n';
import { emptyFilters, facetValues } from '../lib/catalog';
import { FACETS, TYPES, TYPE_INFO } from '../lib/constants';
import { setHash } from '../lib/hash';
import { highlight, search } from '../lib/search';
import { homeHash } from '../lib/route';
import { fmt } from '../lib/text';
import type { Artifact, Catalog, Filters } from '../lib/types';

interface Props {
  catalog: Catalog;
  q: string;
  f: Filters;
  sort: string;
  loaded: boolean;
  narrow: boolean;
}

/** Search ideas drawn from what is actually in the catalog: its most common tags. */
function suggestionsFrom(arts: Artifact[]): string[] {
  const n: Record<string, number> = {};
  arts.forEach((a) => a.tags.forEach((t) => (n[t] = (n[t] ?? 0) + 1)));
  return Object.keys(n).sort((a, b) => n[b] - n[a] || a.localeCompare(b)).slice(0, 5);
}

export function Home({ catalog, q, f, sort, loaded, narrow }: Props) {
  const { arts, rel, meta } = catalog;
  const suggestions = useMemo(() => suggestionsFrom(arts), [arts]);
  const [sheet, setSheet] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [allTags, setAllTags] = useState(false);

  const update = (next: { q: string; f: Filters; sort: string }, push: boolean) => setHash(homeHash(next), push ? 'push' : 'replace');

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false);
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [sheet]);

  const { res, terms } = useMemo(() => (q ? search(arts, q) : { res: arts.map((a) => ({ a, score: 0 })), terms: [] as string[] }), [arts, q]);

  const pass = (a: Artifact, skip?: string) =>
    FACETS.every(([k]) => k === skip || !f[k].length || facetValues(a, k).some((v) => f[k].includes(v)));

  const sortEff = sort || (q ? 'relevance' : 'name');
  const results = res
    .filter((x) => pass(x.a))
    .sort((x, y) =>
      sortEff === 'relevance'
        ? y.score - x.score || x.a.name.localeCompare(y.a.name)
        : sortEff === 'updated'
          ? (y.a.updatedAt ?? "").localeCompare(x.a.updatedAt ?? "") || x.a.name.localeCompare(y.a.name)
          : x.a.name.localeCompare(y.a.name),
    );

  const toggle = (k: keyof Filters, v: string) => {
    const cur = f[k];
    update({ q, f: { ...f, [k]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] }, sort }, true);
  };

  const chips = FACETS.flatMap(([k, facet]) =>
    f[k].map((v) => {
      const text = k === 'type' ? (TYPE_INFO[v as keyof typeof TYPE_INFO]?.label ?? v) : v;
      return { k, v, facet, text, label: m.home.chip(facet, text) };
    }),
  );
  const hasChips = chips.length > 0 || !!q;
  const clearAll = () => update({ q: '', f: emptyFilters(), sort: '' }, true);
  const showAside = !narrow || sheet;
  const sheetOpen = narrow && sheet;
  const heroCmd = `/plugin marketplace add ${meta.repo}`;

  return (
    <div className="stack-40" data-screen-label="Home / Browse">
      <section aria-labelledby="hero-title" className="hero-grid">
        <div className="panel hero">
          <h1 id="hero-title" className="h1">{m.home.heroTitle}</h1>
          <p className="lede">
            {rich(m.home.lede, { name: <span className="mono code-inline">{meta.name || m.meta.unnamedMarketplace}</span> })}
          </p>
          <div className="stack-8">
            <span className="small muted">{m.home.step1}</span>
            <div className="code-row">
              <code>{heroCmd}</code>
              <CopyButton id="hero" text={heroCmd} idle={m.common.copy} className="btn-copy" ariaLabel={m.home.copyMarketplaceAria} />
            </div>
          </div>
          <a href="#/start" className="medium">{m.home.getStarted}</a>
        </div>
        <section aria-labelledby="stats-title" className="panel stats">
          <div className="between">
            <h2 id="stats-title" className="eyebrow">{m.home.catalog}</h2>
            <span className="small muted">
              {meta.generatedAt && <>{m.common.updated(fmt(meta.generatedAt.slice(0, 10)) ?? '')}</>}
              {meta.commit && <> · <span className="mono">{meta.commit}</span></>}
            </span>
          </div>
          <dl className="stats-grid">
            {TYPES.map((t) => {
              const n = arts.filter((a) => a.type === t.id).length;
              return (
                <div key={t.id} className="stat">
                  <dt>{t.plural}</dt>
                  <dd style={{ color: n ? 'var(--text)' : 'var(--border-strong)' }}>{n}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      </section>

      <section aria-labelledby="browse-title" className="browse" style={{ gridTemplateColumns: narrow ? 'minmax(0,1fr)' : '220px minmax(0,1fr)' }}>
        {sheetOpen && <div onClick={() => setSheet(false)} aria-hidden="true" className="overlay" />}
        {showAside && (
          <aside aria-label={m.home.filters} role={narrow ? 'dialog' : undefined} aria-modal={sheetOpen || undefined} className={narrow ? 'filters sheet' : 'filters'}>
            {sheetOpen && (
              <div className="between">
                <h2 className="h3">{m.home.filters}</h2>
                <button type="button" className="btn-sheet" onClick={() => setSheet(false)}>{m.common.close}</button>
              </div>
            )}
            {FACETS.map(([k, label]) => {
              const counts: Record<string, number> = {};
              res.filter((x) => pass(x.a, k)).forEach((x) => facetValues(x.a, k).forEach((v) => (counts[v] = (counts[v] ?? 0) + 1)));
              let vals = k === 'type' ? TYPES.map((t) => t.id as string) : [...new Set(arts.flatMap((a) => facetValues(a, k)))];
              if (k !== 'type') vals.sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0) || a.localeCompare(b));
              const limit = k === 'tag' && !allTags ? 8 : 99;
              const more = vals.length > limit;
              vals = vals.slice(0, limit);
              const expanded = !collapsed[k];
              return (
                <fieldset key={k} className="facet">
                  <legend>
                    <span className="between">
                      <button type="button" className="facet-toggle" aria-expanded={expanded} onClick={() => setCollapsed((s) => ({ ...s, [k]: !s[k] }))}>
                        <span aria-hidden="true" style={{ width: 10 }}>{expanded ? '▾' : '▸'}</span>
                        {label}
                      </button>
                      {f[k].length > 0 && (
                        <button type="button" className="link-btn small" aria-label={m.home.clearFilterAria(label)} onClick={() => update({ q, f: { ...f, [k]: [] }, sort }, true)}>
                          {m.common.clear}
                        </button>
                      )}
                    </span>
                  </legend>
                  {expanded && (
                    <div className="facet-options">
                      {vals.map((v) => {
                        const n = counts[v] ?? 0;
                        const checked = f[k].includes(v);
                        const disabled = !n && !checked;
                        return (
                          <label key={v} className="facet-option" style={{ cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.45 : 1 }}>
                            <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(k, v)} />
                            {k === 'type' && (
                              <span aria-hidden="true" className="facet-glyph" style={{ color: `var(--t-${v})` }}>{TYPE_INFO[v as keyof typeof TYPE_INFO].glyph}</span>
                            )}
                            <span className="grow">{k === 'type' ? TYPE_INFO[v as keyof typeof TYPE_INFO].label : k === 'tag' ? m.common.tag(v) : v}</span>
                            <span className="mono tiny muted">{n}</span>
                          </label>
                        );
                      })}
                      {k === 'tag' && (more || allTags) && (
                        <button type="button" className="link-btn" onClick={() => setAllTags((s) => !s)}>
                          {allTags ? m.home.showFewer : m.home.showAllTags}
                        </button>
                      )}
                    </div>
                  )}
                </fieldset>
              );
            })}
            {sheetOpen && (
              <button type="button" className="btn-primary block" onClick={() => setSheet(false)}>
                {m.home.showResults(results.length)}
              </button>
            )}
          </aside>
        )}

        <div className="stack-16 minw0">
          <div className="results-head">
            <h2 id="browse-title" className="h2">{q ? m.home.titleQuery(q) : m.home.titleAll}</h2>
            <span className="small muted">{m.home.results(results.length)}</span>
            <div className="results-tools">
              {narrow && (
                <button type="button" className="btn-sheet" onClick={() => setSheet(true)} aria-haspopup="dialog">
                  {chips.length ? m.home.filtersWithCount(chips.length) : m.home.filters}
                </button>
              )}
              <label className="sort">
                {m.home.sort}
                <select value={sortEff} onChange={(e) => update({ q, f, sort: e.target.value }, true)}>
                  <option value="relevance" disabled={!q}>{m.home.sortRelevance}</option>
                  <option value="name">{m.home.sortName}</option>
                  <option value="updated">{m.home.sortUpdated}</option>
                </select>
              </label>
            </div>
          </div>

          {hasChips && (
            <div className="chips">
              {chips.map((c) => (
                <button key={c.k + c.v} type="button" className="chip" aria-label={m.home.removeFilterAria(c.facet, c.text)} onClick={() => toggle(c.k, c.v)}>
                  {c.label}
                  <span aria-hidden="true" className="muted">×</span>
                </button>
              ))}
              <button type="button" className="link-btn" onClick={clearAll}>{m.home.clearAll}</button>
            </div>
          )}

          {!loaded && (
            <div aria-busy="true" className="cards">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="skeleton" />)}
            </div>
          )}
          {loaded && results.length > 0 && (
            <ul className="cards">
              {results.map(({ a }) => <li key={a.id} className="card-li"><Card a={a} terms={terms} /></li>)}
            </ul>
          )}
          {loaded && arts.length === 0 && (
            <div className="empty">
              <h3 className="h3">{m.home.emptyCatalogTitle}</h3>
              <p className="muted" style={{ margin: 0, maxWidth: '60ch' }}>
                {rich(m.home.emptyCatalog, { dir: <span className="mono">plugins/</span> })}
              </p>
            </div>
          )}
          {loaded && arts.length > 0 && results.length === 0 && (
            <div className="empty">
              <h3 className="h3 wrap">{q ? m.home.noResultsQuery(q) : m.home.noResultsFilters}</h3>
              <p className="muted" style={{ margin: 0, maxWidth: '60ch' }}>{m.home.noResultsHint}</p>
              <div className="chips">
                {suggestions.map((s) => (
                  <button key={s} type="button" className="chip pill" onClick={() => update({ q: s, f: emptyFilters(), sort: '' }, true)}>{s}</button>
                ))}
              </div>
              {hasChips && <button type="button" className="link-btn" onClick={clearAll}>{m.home.clearSearchAndFilters}</button>}
            </div>
          )}
        </div>
      </section>

      <section aria-labelledby="new-title" className="stack-16">
        <div className="baseline">
          <h2 id="new-title" className="h2">{m.home.whatsNew}</h2>
          <a href="#/new" style={{ marginLeft: 'auto', fontSize: 14 }}>{m.home.allReleases}</a>
        </div>
        {rel.length === 0 && loaded && <p className="muted" style={{ margin: 0 }}>{m.home.noReleases}</p>}
        <ul className="cards">
          {rel.slice(0, 3).map((r) => (
            <li key={r.plugin + r.version} className="release-card">
              <div className="row-wrap">
                <a href={r.href} className="mono release-name">{r.plugin}</a>
                <span className="mono tiny accent">v{r.version}</span>
                <span className="small muted" style={{ marginLeft: 'auto' }}>{fmt(r.date) ?? m.common.noDate}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14 }}>{r.notes}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Card({ a, terms }: { a: Artifact; terms: string[] }) {
  return (
    <article className="card">
      <div className="row-wrap">
        <TypeBadge type={a.type} />
        <span className="mono tiny muted">v{a.version}</span>
        <span className="grow" />
        <SecBadges security={a.security} />
      </div>
      <div className="stack-2 minw0">
        <h3 className="card-title mono">
          <a href={a.href} className="card-link">{a.name}</a>
        </h3>
        <span className="small muted">
          {[a.type === 'plugin' ? m.home.card.items(a.children.length) : m.home.card.inPlugin(a.plugin), a.author].filter(Boolean).join(' · ')}
        </span>
      </div>
      <p className="card-desc">
        {highlight(a.description, terms).map((s, i) => (s.hit ? <mark key={i}>{s.t}</mark> : <span key={i}>{s.t}</span>))}
      </p>
      <div className="tags">
        {a.tags.slice(0, 3).map((t) => <span key={t} className="tag">{m.common.tag(t)}</span>)}
      </div>
      <div className="card-foot">
        <CopyButton id={'c:' + a.id} text={a.installCommand} idle={m.home.card.copyInstall} className="btn-copy card-copy" ariaLabel={m.home.card.copyInstallAria(a.name)} title={a.installCommand} stop />
        {a.updatedAt && <span className="small muted ellipsis">{m.common.updated(fmt(a.updatedAt) ?? '')}</span>}
      </div>
    </article>
  );
}

