import { describe, expect, it } from 'vitest';
import { buildCatalog } from './catalog';
import { highlight, lev, search } from './search';
import { homeHash, parseRoute } from './route';
import type { IndexArtifact, IndexJson } from './types';

// Fixture shaped like scripts/build-index.mjs output. Test data only; the site itself ships no sample content.
const art = (o: Partial<IndexArtifact> & Pick<IndexArtifact, 'id' | 'type' | 'name' | 'plugin' | 'description'>): IndexArtifact => ({
  tags: [], category: null, author: 'a', version: '1.0.0', tools: [], installCommand: `/plugin install ${o.plugin}@mp`, path: 'x.md',
  sourceUrl: 'u', body: '', security: { hooks: false, mcp: false, scripts: false }, compat: { claudeCode: null, os: null }, updatedAt: null, ...o,
});
const index: IndexJson = {
  schemaVersion: 1, generatedAt: '2026-01-01T00:00:00Z', commit: 'abc', marketplace: { name: 'mp', repo: 'me/mp', description: null },
  stats: {},
  artifacts: [
    art({ id: 'pr', type: 'plugin', name: 'pr', plugin: 'pr', description: 'Review pull requests', tags: ['review'], children: ['pr/skill/review-pr'] }),
    art({ id: 'pr/skill/review-pr', type: 'skill', name: 'review-pr', plugin: 'pr', description: 'Reviews the current branch diff', tags: ['review'] }),
    art({ id: 'docs', type: 'plugin', name: 'docs', plugin: 'docs', description: 'Writes READMEs', tags: ['docs'], children: [] }),
  ],
  releases: [{ plugin: 'pr', version: '1.0.0', date: null, notes: 'First' }],
};
const { arts, byId, rel } = buildCatalog(index);
const ids = (q: string) => search(arts, q).res.sort((a, b) => b.score - a.score).map((r) => r.a.id);

describe('catalog', () => {
  it('shows exactly what the index contains', () => {
    expect(arts.map((a) => a.id).sort()).toEqual(['docs', 'pr', 'pr/skill/review-pr']);
    expect(rel).toEqual([{ plugin: 'pr', version: '1.0.0', date: null, notes: 'First', href: '#/plugin/pr' }]);
  });
  it('links children and changelogs', () => {
    expect(byId['pr/skill/review-pr'].href).toBe('#/skill/pr/review-pr');
    expect(byId['pr/skill/review-pr'].changelog).toHaveLength(1);
    expect(byId.docs.changelog).toEqual([]);
  });
  it('an empty index is an empty catalog', () => {
    expect(buildCatalog({ ...index, artifacts: [], releases: [] }).arts).toEqual([]);
  });
});

describe('search', () => {
  it('finds by keyword', () => expect(ids('review')[0]).toBe('pr/skill/review-pr'));
  it('understands Ukrainian synonyms and type words', () => {
    const r = ids("скіл для рев'ю");
    expect(r[0]).toBe('pr/skill/review-pr');
    expect(r).not.toContain('docs');
  });
  it('tolerates a typo', () => expect(ids('reviw')).toContain('pr'));
  it('returns nothing for a stop-word-only query', () => expect(search(arts, 'the').res).toEqual([]));
  it('lev bails out past max', () => expect(lev('abc', 'xyzxyz', 1)).toBeGreaterThan(1));
  it('highlights matching words', () => expect(highlight('Review the diff', ['review']).map((s) => s.hit)).toEqual([true, false, false, false, false]));
});

describe('route', () => {
  it('round-trips home filters', () => {
    const h = homeHash({ q: 'a b', f: { type: ['skill', 'agent'], category: [], tag: [], author: [] }, sort: 'name' });
    expect(parseRoute(h)).toMatchObject({ view: 'home', q: 'a b', sort: 'name', f: { type: ['skill', 'agent'] } });
  });
  it('maps detail routes to artifact ids', () => {
    expect(parseRoute('#/skill/starter/hello')).toEqual({ view: 'detail', id: 'starter/skill/hello' });
    expect(parseRoute('#/plugin/starter')).toEqual({ view: 'detail', id: 'starter' });
    expect(parseRoute('#/nope/x')).toEqual({ view: '404' });
  });
});
