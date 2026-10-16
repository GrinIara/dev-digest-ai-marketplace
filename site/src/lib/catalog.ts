import { tok } from './text';
import type { Artifact, Catalog, Filters, IndexJson } from './types';

const hrefFor = (a: { type: string; plugin: string; name: string }) =>
  a.type === 'plugin' ? `#/plugin/${encodeURIComponent(a.name)}` : `#/${a.type}/${encodeURIComponent(a.plugin)}/${encodeURIComponent(a.name)}`;

export const EMPTY_CATALOG: Catalog = {
  meta: { name: '', repo: '', commit: null, generatedAt: null, github: '' },
  arts: [],
  rel: [],
  byId: {},
};

/** Turns index.json into the shape the UI uses: adds links, search tokens and per-plugin changelogs. */
export function buildCatalog(index: IndexJson): Catalog {
  const arts: Artifact[] = index.artifacts.map((a) => ({
    ...a,
    children: a.children ?? [],
    href: hrefFor(a),
    changelog: index.releases.filter((r) => r.plugin === a.plugin),
    idx: {
      name: tok(a.name),
      tags: tok([...a.tags, a.category ?? '', a.plugin].join(' ')),
      description: tok(a.description),
      body: tok(a.body),
    },
  }));
  arts.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return {
    meta: {
      name: index.marketplace.name,
      repo: index.marketplace.repo,
      commit: index.commit,
      generatedAt: index.generatedAt,
      github: `https://github.com/${index.marketplace.repo}`,
    },
    arts,
    rel: index.releases.map((r) => ({ ...r, href: `#/plugin/${encodeURIComponent(r.plugin)}` })),
    byId: Object.fromEntries(arts.map((a) => [a.id, a])),
  };
}

export const emptyFilters = (): Filters => ({ type: [], category: [], tag: [], author: [] });

export function facetValues(a: Artifact, key: keyof Filters): string[] {
  const v = key === 'type' ? [a.type] : key === 'tag' ? a.tags : key === 'author' ? [a.author] : [a.category];
  return v.filter((x): x is string => !!x);
}
