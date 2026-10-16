import { emptyFilters } from './catalog';
import { FACETS, TYPE_INFO } from './constants';
import type { Filters } from './types';

export type Route =
  | { view: 'home'; q: string; f: Filters; sort: string }
  | { view: 'new'; plugin: string }
  | { view: 'start' }
  | { view: 'detail'; id: string }
  | { view: '404' };

export function parseRoute(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  const [path, qs] = h.split('?');
  const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  const p = new URLSearchParams(qs ?? '');
  const list = (k: string) => (p.get(k) ?? '').split(',').filter(Boolean);

  if (!parts.length)
    return {
      view: 'home',
      q: p.get('q') ?? '',
      f: { type: list('type'), category: list('category'), tag: list('tag'), author: list('author') },
      sort: p.get('sort') ?? '',
    };
  if (parts[0] === 'new' && parts.length === 1) return { view: 'new', plugin: p.get('plugin') ?? '' };
  if (parts[0] === 'start' && parts.length === 1) return { view: 'start' };
  if (parts[0] === 'plugin' && parts.length === 2) return { view: 'detail', id: parts[1] };
  if (parts[0] in TYPE_INFO && parts.length === 3) return { view: 'detail', id: `${parts[1]}/${parts[0]}/${parts[2]}` };
  return { view: '404' };
}

export function homeHash({ q, f, sort }: { q: string; f: Filters; sort: string }): string {
  const p = new URLSearchParams();
  if (q) p.set('q', q);
  for (const [k] of FACETS) if (f[k].length) p.set(k, f[k].join(','));
  if (sort) p.set('sort', sort);
  const s = p.toString().replace(/%2C/g, ',');
  return '#/' + (s ? '?' + s : '');
}

export { emptyFilters };
