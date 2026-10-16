import { useState } from 'react';
import { CopyButton } from '../components/CopyButton';
import { m, rich } from '../i18n';
import { useCopy } from '../lib/copy';
import type { Catalog } from '../lib/types';

export function Start({ catalog }: { catalog: Catalog }) {
  const { status } = useCopy();
  const [plugin, setPlugin] = useState('');
  const pluginArts = catalog.arts.filter((a) => a.type === 'plugin');
  const plugins = pluginArts.map((a) => a.name);
  const first = pluginArts[0];
  // The commands are Claude Code syntax, not translatable text; the titles and notes come from the messages.
  const commands = [
    `/plugin marketplace add ${catalog.meta.repo}`,
    `/plugin install ${plugin || m.start.pluginPlaceholder}@${catalog.meta.name}`,
    '/reload-plugins',
  ];
  const permissions = first ? <a href={first.href}>{m.common.permissions}</a> : m.common.permissions;
  return (
    <section data-screen-label="Get started" aria-labelledby="start-title" className="stack-28" style={{ maxWidth: 780 }}>
      <div className="stack-10">
        <h1 id="start-title" className="h1 page">{m.start.title}</h1>
        <p className="muted" style={{ margin: 0 }}>{m.start.intro}</p>
      </div>
      <ol className="steps">
        {m.start.steps.map(({ title, note }, i) => {
          const cmd = commands[i];
          const done = status('s' + i) === 'copied';
          return (
            <li key={title} className="step">
              <span aria-hidden="true" className="step-dot" style={{ background: done ? 'var(--accent)' : 'var(--surface-2)', color: done ? 'var(--accent-ink)' : 'var(--text)' }}>
                {done ? '✓' : i + 1}
              </span>
              <div className="stack-10 minw0">
                <div className="row-wrap" style={{ gap: 12 }}>
                  <h2 className="h-step">{title}</h2>
                  {i === 1 && (
                    <label className="sort" style={{ marginLeft: 'auto', fontSize: 13.5 }}>
                      {m.start.pluginLabel}
                      <select value={plugin} onChange={(e) => setPlugin(e.target.value)} style={{ height: 34 }}>
                        <option value="">{m.start.pluginPlaceholder}</option>
                        {plugins.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                  )}
                </div>
                <div className="code-row">
                  <code style={{ fontSize: 13.5 }}>{cmd}</code>
                  <CopyButton id={'s' + i} text={cmd} idle={m.common.copy} className="btn-copy" ariaLabel={m.start.copyStepAria(i + 1)} />
                </div>
                <span className="muted" style={{ fontSize: 13.5 }}>{note}</span>
              </div>
            </li>
          );
        })}
      </ol>
      <div role="note" className="warn-note">
        <span aria-hidden="true" className="warn" style={{ fontWeight: 600 }}>⚠</span>
        <p style={{ margin: 0, fontSize: 14.5 }}>{rich(m.start.warn, { permissions })}</p>
      </div>
      <div><a href="#/" className="btn-primary link-btn-lg">{m.start.browsePlugins}</a></div>
    </section>
  );
}
