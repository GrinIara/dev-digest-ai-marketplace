import { useMemo, useState, type KeyboardEvent } from 'react';
import { CopyButton } from '../components/CopyButton';
import { SecBadges, TypeBadge } from '../components/Badges';
import { m, rich } from '../i18n';
import { TYPE_INFO } from '../lib/constants';
import { renderMarkdown } from '../lib/markdown';
import { fmt } from '../lib/text';
import type { Artifact, Catalog } from '../lib/types';

type TabId = 'overview' | 'includes' | 'perms' | 'compat' | 'log';

export function Detail({ a, catalog, wide }: { a: Artifact; catalog: Catalog; wide: boolean }) {
  const { arts, byId } = catalog;
  const [tab, setTab] = useState<TabId>('overview');
  const html = useMemo(
    () => renderMarkdown(a.body, `${catalog.meta.github}/blob/main/${a.path.slice(0, a.path.lastIndexOf('/') + 1)}`),
    [a.body, a.path, catalog.meta.github],
  );
  const isPlugin = a.type === 'plugin';
  const parent = byId[a.plugin];
  const includes = isPlugin ? a.children.map((id) => byId[id]) : [parent, ...parent.children.filter((id) => id !== a.id).map((id) => byId[id])];
  const related = [
    ...arts
      .filter((x) => x.id !== a.id && x.plugin !== a.plugin && x.tags.some((t) => a.tags.includes(t)))
      .map((x) => ({ x, why: m.detail.sharedTag(x.tags.find((t) => a.tags.includes(t)) ?? '') })),
    ...(isPlugin ? [] : includes.filter((x) => x.type !== 'plugin').map((x) => ({ x, why: m.detail.samePlugin }))),
  ].slice(0, 4);

  const tabs: [TabId, string, number?][] = [
    ['overview', m.detail.tabs.overview],
    ['includes', isPlugin ? m.detail.tabs.includesPlugin : m.detail.tabs.includesChild, includes.length],
    ['perms', m.detail.tabs.perms],
    ['compat', m.detail.tabs.compat],
    ['log', m.detail.tabs.log, a.changelog.length],
  ];

  const onTabKey = (e: KeyboardEvent) => {
    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    const ids = tabs.map((t) => t[0]);
    let i = ids.indexOf(tab);
    i = e.key === 'Home' ? 0 : e.key === 'End' ? ids.length - 1 : (i + (e.key === 'ArrowRight' ? 1 : -1) + ids.length) % ids.length;
    setTab(ids[i]);
    requestAnimationFrame(() => document.getElementById('tab-' + ids[i])?.focus());
  };

  const s = a.security;
  const p = m.detail.perms;
  const perms = [
    { label: p.tools, flag: null as boolean | null, chips: a.tools, text: a.tools.length ? '' : p.noTools },
    { label: p.hooks, flag: s.hooks, chips: [], text: s.hooks ? p.hooksYes : p.hooksNo },
    { label: p.mcp, flag: s.mcp, chips: [], text: s.mcp ? p.mcpYes : p.mcpNo },
    { label: p.scripts, flag: s.scripts, chips: [], text: s.scripts ? p.scriptsYes : p.scriptsNo },
  ];
  const typeName = TYPE_INFO[a.type].label.toLowerCase();

  return (
    <article className="stack-28" data-screen-label="Detail">
      <nav aria-label={m.a11y.breadcrumb} className="breadcrumb">
        <a href="#/">{m.common.browse}</a>
        <span aria-hidden="true">/</span>
        {!isPlugin && (
          <>
            <a href={'#/plugin/' + a.plugin} className="mono">{a.plugin}</a>
            <span aria-hidden="true">/</span>
          </>
        )}
        <span aria-current="page" className="mono current">{a.name}</span>
      </nav>

      <header className="detail-head">
        <div className="detail-main">
          <div className="row-wrap">
            <TypeBadge type={a.type} large />
            {a.compat.claudeCode && <span className="mono tag-outline">{m.detail.claudeCode(a.compat.claudeCode)}</span>}
            <SecBadges security={a.security} large />
          </div>
          <h1 className="detail-title mono">{a.name}</h1>
          <p className="detail-desc">{a.description}</p>
          <div className="detail-meta">
            <span>v<span className="mono text">{a.version}</span></span>
            {a.author && <span>{rich(m.detail.by, { author: <span className="text">{a.author}</span> })}</span>}
            {a.updatedAt && <span>{m.common.updated(fmt(a.updatedAt) ?? '')}</span>}
            <a href={a.sourceUrl} target="_blank" rel="noopener">{m.detail.sourceOnGithub}</a>
          </div>
        </div>
        <div className="detail-install">
          <CopyButton id={'d:' + a.id} text={a.installCommand} idle={m.detail.copyInstall} copied={m.detail.copiedToClipboard} failed={m.detail.copyFailedSelect} className="btn-primary hero-btn" />
          <code className="install-code">{a.installCommand}</code>
          {!isPlugin && (
            <span className="small muted">
              {rich(m.detail.installsWhole, { plugin: <span className="mono">{a.plugin}</span>, type: typeName })}
            </span>
          )}
        </div>
      </header>

      <div className="detail-grid" style={{ gridTemplateColumns: wide && window.innerWidth >= 1000 ? 'minmax(0,1fr) 280px' : 'minmax(0,1fr)' }}>
        <div className="stack-24 minw0">
          <div role="tablist" aria-label={m.detail.tabsLabel} onKeyDown={onTabKey} className="tablist">
            {tabs.map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                role="tab"
                id={'tab-' + id}
                aria-selected={tab === id}
                aria-controls="tabpanel"
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                className={'tab' + (tab === id ? ' active' : '')}
              >
                {label}
                {count != null && <span className="count mono">{count}</span>}
              </button>
            ))}
          </div>
          <div id="tabpanel" role="tabpanel" aria-labelledby={'tab-' + tab} tabIndex={0} className="tabpanel">
            {tab === 'overview' && (
              <div className="overview">
                <span className="mono tiny muted">{a.path}</span>
                {html ? (
                  <div className="md" dangerouslySetInnerHTML={{ __html: html }} />
                ) : (
                  <p className="muted" style={{ margin: 0 }}>{m.detail.noDescriptionFile(typeName)}</p>
                )}
              </div>
            )}
            {tab === 'includes' && (
              <ul className="list-box">
                {includes.map((it) => (
                  <li key={it.id}>
                    <a href={it.href} className="include-row">
                      <span className="include-type mono" style={{ color: `var(--t-${it.type})` }}>
                        <span aria-hidden="true">{TYPE_INFO[it.type].glyph}</span>{TYPE_INFO[it.type].label}
                      </span>
                      <span className="include-text">
                        <span className="mono include-name">{it.name}</span>
                        <span className="include-desc">{it.description}</span>
                      </span>
                      <span aria-hidden="true" className="muted">→</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
            {tab === 'perms' && (
              <div className="stack-16">
                <p className="muted" style={{ margin: 0, maxWidth: '70ch' }}>{m.detail.permsIntro}</p>
                <dl className="kv">
                  {perms.map((row) => (
                    <div key={row.label} className="kv-row">
                      <dt>{row.label}</dt>
                      <dd>
                        {row.flag !== null && <span className="mono flag" style={{ color: row.flag ? 'var(--warn)' : 'var(--muted)' }}>{row.flag ? p.yes : p.no}</span>}
                        {row.chips.map((t) => <span key={t} className="mono tool-chip">{t}</span>)}
                        <span>{row.text}</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {tab === 'compat' && (
              <div className="stack-16">
                <dl className="kv">
                  <div className="kv-row"><dt>{m.detail.compat.claudeCode}</dt><dd className="mono">{a.compat.claudeCode ?? m.detail.compat.notStated}</dd></div>
                  <div className="kv-row"><dt>{m.detail.compat.os}</dt><dd>{a.compat.os ? a.compat.os.join(', ') : m.detail.compat.notStated}</dd></div>
                </dl>
                <span className="small muted">
                  {rich(m.detail.compat.note, { file: <span className="mono">COMPATIBILITY.md</span>, plugin: <span className="mono">{a.plugin}</span> })}
                </span>
              </div>
            )}
            {tab === 'log' && (
              a.changelog.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>{m.detail.noChangelog}</p>
              ) : (
              <ol className="timeline">
                {a.changelog.map(({ version, date, notes }, i) => (
                  <li key={version}>
                    <span aria-hidden="true" className="dot" style={{ background: i ? 'var(--surface-2)' : 'var(--accent)' }} />
                    <div className="baseline wrap-row">
                      <span className="mono log-version">{version}</span>
                      <span className="small muted">{fmt(date) ?? m.common.noDateRecorded}</span>
                    </div>
                    <p className="log-notes">{notes}</p>
                  </li>
                ))}
              </ol>
              )
            )}
          </div>
        </div>

        <aside aria-labelledby="related-title" className="stack-12 minw0">
          <h2 id="related-title" className="eyebrow">{m.detail.related}</h2>
          {related.length ? (
            <ul className="related">
              {related.map(({ x, why }) => (
                <li key={x.id}>
                  <a href={x.href} className="related-link">
                    <span className="row-wrap" style={{ gap: 8, flexWrap: 'nowrap' }}>
                      <span className="mono tiny" style={{ color: `var(--t-${x.type})` }}>
                        <span aria-hidden="true">{TYPE_INFO[x.type].glyph}</span> {TYPE_INFO[x.type].label}
                      </span>
                      <span className="mono related-name">{x.name}</span>
                    </span>
                    <span className="small muted">{why}</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0, fontSize: 14 }}>{m.detail.noRelated}</p>
          )}
        </aside>
      </div>
    </article>
  );
}
