import { norm, tok } from './text';
import type { Artifact } from './types';

const STOP = new Set(
  'i a an the for to of and with that me my want need find something is in on please which can some any мені мене треба потрібно потрібен потрібна для щоб що і й та в у на з із який яка яке хочу знайти будь ласка шукаю щось якийсь'.split(
    ' ',
  ),
);

/** Synonym groups: any member expands to the whole group (EN + UK). */
const SYN: Record<string, string[]> = {
  review: ['review', 'reviews', 'reviewing', 'reviewer', "рев'ю", 'ревю', 'ревʼю', 'перевірка', 'перевірити', 'рецензія'],
  test: ['test', 'tests', 'testing', 'тест', 'тести', 'тестів', 'тестування'],
  docs: ['docs', 'documentation', 'readme', 'документація', 'документацію', 'доки'],
  security: ['security', 'secure', 'secrets', 'secret', 'безпека', 'секрети', 'секретів'],
  hello: ['hello', 'greet', 'greets', 'greeting', 'привіт', 'вітання'],
  changelog: ['changelog', 'release', 'releases', 'реліз', 'релізи', 'зміни'],
  react: ['react', 'реакт'],
  github: ['github', 'гітхаб'],
  component: ['component', 'components', 'компонент', 'компоненти'],
  accessibility: ['accessibility', 'a11y', 'доступність'],
  format: ['format', 'formatting', 'formatter', 'форматування'],
  pr: ['pr', 'pull', 'request', 'пулреквест'],
};

/** Words that name an artifact type rather than a topic. */
const TYPE_SYN: Record<string, string[]> = {
  skill: ['skill', 'skills', 'скіл', 'скіла', 'скіли', 'скілів', 'навичка'],
  agent: ['agent', 'agents', 'subagent', 'агент', 'агента', 'агенти'],
  command: ['command', 'commands', 'команда', 'команду', 'команди'],
  hook: ['hook', 'hooks', 'хук', 'хуки'],
  mcp: ['mcp'],
  plugin: ['plugin', 'plugins', 'плагін', 'плагіна', 'плагіни'],
};

const invert = (m: Record<string, string[]>): Record<string, string> =>
  Object.fromEntries(Object.entries(m).flatMap(([k, v]) => v.map((x) => [x, k])));
const SYN_OF = invert(SYN);
const TYPE_OF = invert(TYPE_SYN);

const WEIGHTS = { name: 5, tags: 3, description: 2, body: 1 } as const;

/** Levenshtein distance, bailing out once it exceeds `max`. */
export function lev(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      min = Math.min(min, cur[j]);
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

function termScore(term: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === term) return 1;
    if (term.length >= 2 && w.startsWith(term)) best = Math.max(best, 0.7);
    else if (term.length >= 5 && /[а-яіїєґ]/.test(term) && w.startsWith(term.slice(0, -1))) best = Math.max(best, 0.6);
    else if (term.length >= 4) {
      const m = term.length >= 7 ? 2 : 1;
      if (lev(term, w, m) <= m) best = Math.max(best, 0.4);
    }
  }
  return best;
}

export interface SearchResult {
  res: { a: Artifact; score: number }[];
  /** Terms to highlight in result text. */
  terms: string[];
}

export function search(arts: Artifact[], q: string): SearchResult {
  const toks = tok(q).filter((t) => !STOP.has(t));
  const groups: string[][] = [];
  const types = new Set<string>();
  for (const t of toks) {
    if (TYPE_OF[t]) types.add(TYPE_OF[t]);
    else groups.push(SYN_OF[t] ? SYN[SYN_OF[t]] : [t]);
  }
  if (!groups.length && !types.size) return { res: [], terms: [] };

  const scored = arts.map((a) => {
    const gs = groups.map((alts) => {
      let best = 0;
      for (const t of alts)
        for (const f of Object.keys(WEIGHTS) as (keyof typeof WEIGHTS)[])
          best = Math.max(best, termScore(t, a.idx[f]) * WEIGHTS[f]);
      return best;
    });
    return { a, gs, base: gs.reduce((x, y) => x + y, 0) + (types.has(a.type) ? 4 : 0) };
  });

  let res = scored.filter((r) => (groups.length ? r.gs.every((g) => g > 0) : types.has(r.a.type)));
  if (!res.length && groups.length) res = scored.filter((r) => r.gs.some((g) => g > 0));
  return { res: res.map((r) => ({ a: r.a, score: r.base })), terms: groups.flat().filter((t) => t.length >= 3) };
}

export interface Seg {
  t: string;
  hit: boolean;
}

/** Splits text into words, flagging the ones that match a search term. */
export function highlight(text: string, terms: string[]): Seg[] {
  if (!terms.length) return [{ t: text, hit: false }];
  return text
    .split(/([\p{L}\p{N}']+)/u)
    .filter(Boolean)
    .map((p) => {
      const w = norm(p);
      const hit =
        /[\p{L}\p{N}]/u.test(p) &&
        terms.some((t) => w === t || (t.length >= 3 && w.startsWith(t)) || (w.length >= 4 && t.startsWith(w)));
      return { t: p, hit };
    });
}
