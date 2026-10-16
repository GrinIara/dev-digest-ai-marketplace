import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseSync } from 'rolldown/utils';
import { describe, expect, it } from 'vitest';
import { en } from './en';

// All user-visible text lives in src/i18n/en.ts. This test parses the UI source and fails when a
// component, view or lib file puts readable text in markup or in a user-facing string.

const SRC = join(__dirname, '..');
const UI_DIRS = ['components', 'views'];
const UI_FILES = ['App.tsx', 'main.tsx'];
// Attributes whose values are identifiers, class names or URLs, never text for a person.
const NON_TEXT_ATTRS = new Set(['className', 'id', 'key', 'href', 'src', 'style', 'htmlFor']);
// Strings with words in them that are not text for a person.
const ALLOWED_STRINGS = [
  /must be used inside/, // a developer error that is thrown, not shown
  /^noopener noreferrer$/, // a link `rel` value
  /^\/(plugin|reload-plugins)/, // Claude Code commands the site shows for copying
];
// Files that hold language data for search rather than interface text.
const EXEMPT_FILES = new Set(['lib/search.ts']);

type Node = { type: string; [k: string]: unknown };
const isNode = (x: unknown): x is Node => !!x && typeof x === 'object' && typeof (x as Node).type === 'string';

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return files(p);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [p] : [];
  });
}

const hasLetters = (s: string) => /\p{L}{2,}/u.test(s);
/** A file name or folder such as CHANGELOG.md or plugins/. Shown as code, not translated. */
const isPathLike = (s: string) => /^[\w./-]*[./][\w./-]*$/.test(s.trim());
/** Looks like text for a person: has a space or a capital letter. Lowercase tokens such as "dark" or "search" are identifiers. */
const looksLikeText = (s: string) => hasLetters(s) && (/\s/.test(s) || /\p{Lu}/u.test(s));
const isTextAttr = (a: Node) => {
  const name = String((a.name as { name: unknown }).name);
  return !NON_TEXT_ATTRS.has(name) && !name.startsWith('data-');
};

function parse(file: string): Node {
  return parseSync(file, readFileSync(file, 'utf8'), { lang: file.endsWith('x') ? 'tsx' : 'ts' }).program as unknown as Node;
}

/** Visits every node. `visit` may return false to skip the node's children. */
function walk(node: unknown, visit: (n: Node, parent: Node | null) => boolean | void, parent: Node | null = null): void {
  if (Array.isArray(node)) return node.forEach((c) => walk(c, visit, parent));
  if (!isNode(node)) {
    if (node && typeof node === 'object') for (const v of Object.values(node)) walk(v, visit, parent);
    return;
  }
  if (visit(node, parent) === false) return;
  for (const [k, v] of Object.entries(node)) if (k !== 'parent') walk(v, visit, node);
}

/** The string values of literals under `node`. Comparisons, non-text attributes and (optionally) nested JSX are left out. */
function stringsIn(node: unknown, opts: { skipJsx: boolean }): string[] {
  const out: string[] = [];
  walk(node, (n, parent) => {
    if (opts.skipJsx && n.type.startsWith('JSX')) return false; // nested markup is checked on its own
    if (n.type === 'JSXAttribute' && !isTextAttr(n)) return false;
    if (parent?.type === 'BinaryExpression' && ['==', '===', '!=', '!=='].includes(parent.operator as string)) return false;
    if (parent?.type === 'ImportDeclaration' || parent?.type === 'ExportAllDeclaration' || parent?.type === 'ExportNamedDeclaration') return false;
    if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value);
    if (n.type === 'TemplateLiteral') (n.quasis as { value: { cooked: string } }[]).forEach((q) => out.push(q.value.cooked));
  });
  return out;
}

/** Text written in markup: JSX text, text attributes and string expressions used as children. */
function markupViolations(file: string): string[] {
  const found: string[] = [];
  walk(parse(file), (n, parent) => {
    if (n.type === 'JSXText' && hasLetters(String(n.value)) && !isPathLike(String(n.value))) found.push(`text "${String(n.value).trim()}"`);
    if (n.type === 'JSXAttribute' && isTextAttr(n) && n.value) {
      for (const s of stringsIn(n.value, { skipJsx: true })) if (looksLikeText(s)) found.push(`${String((n.name as { name: unknown }).name)}="${s}"`);
    }
    // Text written as an expression child, for example {open ? 'Close' : 'Open'}.
    if (n.type === 'JSXExpressionContainer' && (parent?.type === 'JSXElement' || parent?.type === 'JSXFragment')) {
      for (const s of stringsIn(n.expression, { skipJsx: true })) if (looksLikeText(s)) found.push(`{"${s}"}`);
    }
  });
  return found;
}

/** Any literal that reads like a sentence or label: two words or more. Catches default parameters, constants and thrown text. */
function sentenceViolations(file: string): string[] {
  return stringsIn(parse(file), { skipJsx: false })
    .filter((s) => /\p{L}{2,}\s+\p{L}{2,}/u.test(s) && !ALLOWED_STRINGS.some((re) => re.test(s)))
    .map((s) => `"${s}"`);
}

describe('UI text lives in src/i18n/en.ts', () => {
  const ui = [...UI_DIRS.flatMap((d) => files(join(SRC, d))), ...UI_FILES.map((f) => join(SRC, f))];
  for (const file of ui) {
    it(`${relative(SRC, file)} has no hard-coded text`, () => {
      expect([...markupViolations(file), ...sentenceViolations(file)]).toEqual([]);
    });
  }

  const lib = files(join(SRC, 'lib')).filter((f) => !/(constants|types)\.ts$/.test(f) && !EXEMPT_FILES.has(relative(SRC, f)));
  for (const file of lib) {
    it(`${relative(SRC, file)} has no user-facing string literals`, () => {
      expect(sentenceViolations(file)).toEqual([]);
    });
  }

  it('index.html title and description match the messages file', () => {
    const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8');
    expect(html).toContain(`<title>${en.meta.title}</title>`);
    expect(html).toContain(`content="${en.meta.description}"`);
  });
});
