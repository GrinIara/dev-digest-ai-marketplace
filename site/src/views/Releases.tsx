import { m, rich } from '../i18n';
import { fmt } from '../lib/text';
import { setHash } from '../lib/hash';
import type { Catalog } from '../lib/types';

export function Releases({ catalog, plugin, wide }: { catalog: Catalog; plugin: string; wide: boolean }) {
  const plugins = catalog.arts.filter((a) => a.type === 'plugin').map((a) => a.name);
  const releases = catalog.rel.filter((r) => !plugin || r.plugin === plugin);
  return (
    <section data-screen-label="What's new" aria-labelledby="releases-title" className="stack-28 narrow-col" style={{ maxWidth: 820 }}>
      <div className="stack-10">
        <h1 id="releases-title" className="h1 page">{m.releases.title}</h1>
        <p className="muted" style={{ margin: 0 }}>
          {rich(m.releases.note, { file: <span className="mono" style={{ fontSize: 13.5 }}>CHANGELOG.md</span> })}
        </p>
      </div>
      <div className="toolbar">
        <label className="sort">
          {m.releases.pluginLabel}
          <select value={plugin} onChange={(e) => setHash('#/new' + (e.target.value ? '?plugin=' + e.target.value : ''), 'replace')}>
            <option value="">{m.releases.allPlugins}</option>
            {plugins.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <span className="grow" />
        <a href="feed.json" className="btn-ghost link mono">{m.releases.feedJson}</a>
        <a href="feed.xml" className="btn-ghost link mono">{m.releases.feedAtom}</a>
      </div>
      <ol className="release-list">
        {releases.map((r) => (
          <li key={r.plugin + r.version} className="release-row" style={{ gridTemplateColumns: wide || window.innerWidth >= 640 ? '120px minmax(0,1fr)' : 'minmax(0,1fr)' }}>
            <span style={{ fontSize: 13.5, color: r.date ? 'var(--text)' : 'var(--muted)' }}>{fmt(r.date) ?? m.common.noDate}</span>
            <div className="stack-6 minw0">
              <div className="baseline wrap-row">
                <a href={r.href} className="mono release-name big">{r.plugin}</a>
                <span className="mono accent" style={{ fontSize: 12.5 }}>v{r.version}</span>
              </div>
              <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>{r.notes}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
