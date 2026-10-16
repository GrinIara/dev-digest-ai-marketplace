import type { FormEvent } from 'react';
import { m } from '../i18n';
import { emptyFilters } from '../lib/catalog';
import { homeHash } from '../lib/route';

export function NotFound() {
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '');
    location.hash = homeHash({ q, f: emptyFilters(), sort: '' });
  };
  return (
    <section data-screen-label="Not found" className="notfound">
      <span className="mono small muted">{m.notFound.code}</span>
      <h1 className="h1" style={{ fontSize: 30 }}>{m.notFound.title}</h1>
      <p className="muted" style={{ margin: 0 }}>{m.notFound.body}</p>
      <form onSubmit={onSubmit} role="search" className="nf-form">
        <input name="q" type="search" aria-label={m.header.searchLabel} placeholder={m.header.searchPlaceholder} className="focus-ring" />
        <button type="submit" className="btn-primary">{m.notFound.search}</button>
      </form>
      <a href="#/" style={{ fontSize: 14 }}>{m.notFound.back}</a>
    </section>
  );
}
