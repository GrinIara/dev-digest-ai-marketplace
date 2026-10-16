#!/usr/bin/env node
// Builds the site's catalog from the repo: index.json plus feed.json (JSON Feed 1.1) and feed.xml (Atom).
// Usage: node scripts/build-index.mjs [--root <dir>] [--out <dir>] [--repo <owner/name>] [--branch <name>] [--site-url <url>]
// Only real repo content ends up in the output. Missing optional files are tolerated; unparseable
// input fails with a message naming the file. Output is deterministic for a given commit.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export class IndexError extends Error {}
const fail = (file, msg) => {
  throw new IndexError(`${file}: ${msg}`);
};

const SCRIPT_EXT = new Set(['.sh', '.bash', '.zsh', '.py', '.mjs', '.cjs', '.js', '.ts', '.rb', '.ps1']);
const TYPES = ['plugin', 'skill', 'agent', 'command', 'hook', 'mcp'];

const has = (root, rel) => existsSync(join(root, rel));
const text = (root, rel) => readFileSync(join(root, rel), 'utf8');
function json(root, rel) {
  try {
    return JSON.parse(text(root, rel));
  } catch (e) {
    return fail(rel, `cannot parse JSON (${e.message})`);
  }
}
const list = (root, rel) => (has(root, rel) ? readdirSync(join(root, rel)).sort() : []);
const isDir = (root, rel) => has(root, rel) && statSync(join(root, rel)).isDirectory();

function git(root, args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null;
  }
}
const gitDate = (root, rel) => git(root, ['log', '-1', '--format=%cs', '--', rel]);

/** Minimal YAML frontmatter: `key: value`, quoted values and `>` / `|` block scalars. */
export function parseFrontmatter(src, file) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: src };
  const data = {};
  const lines = m[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim() || lines[i].trim().startsWith('#')) continue;
    // Nested maps and lists (for example `metadata:` with indented keys) are valid YAML, but only top-level keys are read.
    if (/^\s+\S/.test(lines[i])) continue;
    const kv = lines[i].match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!kv) fail(file, `cannot parse frontmatter line "${lines[i]}"`);
    let value = kv[2].trim();
    if (value === '>' || value === '|' || value === '>-' || value === '|-') {
      const parts = [];
      while (i + 1 < lines.length && /^\s+\S/.test(lines[i + 1])) parts.push(lines[++i].trim());
      value = parts.join(' ');
    } else if (/^(['"]).*\1$/.test(value)) value = value.slice(1, -1);
    data[kv[1]] = value;
  }
  return { data, body: m[2].replace(/^\s+/, '') };
}

const toList = (v) =>
  String(v ?? '')
    .replace(/[[\]]/g, '')
    .split(/[,\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

/** `## 1.2.0 - 2026-10-14` sections of a CHANGELOG.md. */
export function parseChangelog(src) {
  const out = [];
  let cur = null;
  for (const line of src.split(/\r?\n/)) {
    const h = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+[0-9A-Za-z.+-]*)\]?(?:\s*[-–—(]\s*(\d{4}-\d{2}-\d{2})\)?)?\s*$/);
    if (h) {
      cur = { version: h[1], date: h[2] ?? null, lines: [] };
      out.push(cur);
    } else if (/^##\s/.test(line)) cur = null;
    else if (cur && line.trim()) cur.lines.push(line.trim().replace(/^[-*]\s+/, '').replace(/`/g, ''));
  }
  return out.map((c) => ({ version: c.version, date: c.date, notes: c.lines.join(' ') }));
}

/** Rows of the table in COMPATIBILITY.md. Anything not stated stays null. */
export function parseCompat(src) {
  const rows = {};
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (m) rows[m[1].toLowerCase()] = m[2];
  }
  const ver = rows['claude code']?.match(/\d+\.\d+\.\d+/)?.[0];
  const os = rows['os']
    ? rows['os'].split(/,|\band\b/).map((s) => s.trim()).filter(Boolean).map((s) =>
        /^(mac|darwin)/i.test(s) ? 'macOS' : /^linux/i.test(s) ? 'Linux' : /^win/i.test(s) ? 'Windows' : s)
    : null;
  return { claudeCode: ver ? `${ver}+` : null, os };
}

// Folders that hold documentation, examples or manifests, never something a plugin runs.
const NOT_EXECUTABLE_DIRS = new Set(['node_modules', '.claude-plugin', 'references', 'assets', 'examples']);
// Extensions that are scripts by themselves. `.js`, `.mjs`, `.cjs` and `.ts` also count as code samples, so they
// only count when the file starts with a shebang.
const ALWAYS_SCRIPT_EXT = new Set(['.sh', '.bash', '.zsh', '.py', '.rb', '.ps1']);

function hasScripts(root, dir) {
  for (const name of list(root, dir)) {
    const rel = `${dir}/${name}`;
    if (NOT_EXECUTABLE_DIRS.has(name)) continue;
    if (isDir(root, rel)) {
      if (name === 'scripts' || name === 'bin' || hasScripts(root, rel)) return true;
    } else if (ALWAYS_SCRIPT_EXT.has(extname(name))) return true;
    else if (SCRIPT_EXT.has(extname(name)) && text(root, rel).startsWith('#!')) return true;
  }
  return false;
}

/** `dependencies` of plugin.json: "name", "name@marketplace" or { name, version?, marketplace? }. */
export function parseDependencies(raw, file) {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) fail(file, '"dependencies" must be an array');
  return raw.map((d) => {
    if (typeof d === 'string' && d.trim()) {
      const [name, marketplace] = d.trim().split('@');
      return { name, version: null, ...(marketplace ? { marketplace } : {}) };
    }
    if (d && typeof d === 'object' && typeof d.name === 'string' && d.name) {
      return { name: d.name, version: typeof d.version === 'string' ? d.version : null, ...(typeof d.marketplace === 'string' ? { marketplace: d.marketplace } : {}) };
    }
    return fail(file, `invalid dependency entry ${JSON.stringify(d)}`);
  });
}

function resolveRepo(root, opts, firstPluginRepo) {
  const fromUrl = (u) => u?.match(/github\.com[:/]([^/]+\/[^/.\s]+)/)?.[1];
  const repo = opts.repo ?? process.env.GITHUB_REPOSITORY ?? fromUrl(firstPluginRepo) ?? fromUrl(git(root, ['remote', 'get-url', 'origin']));
  if (!repo) fail('.claude-plugin/marketplace.json', 'cannot determine the GitHub repo; pass --repo <owner/name>');
  return repo;
}

export function buildIndex(root, opts = {}) {
  const mpPath = '.claude-plugin/marketplace.json';
  if (!has(root, mpPath)) fail(mpPath, 'not found');
  const mp = json(root, mpPath);
  if (!mp.name || !Array.isArray(mp.plugins)) fail(mpPath, 'needs "name" and a "plugins" array');

  const manifests = mp.plugins.map((entry) => {
    if (!entry.name || typeof entry.source !== 'string') fail(mpPath, `plugin entry needs "name" and a relative "source": ${JSON.stringify(entry)}`);
    const dir = resolve(root, entry.source);
    if (dir !== resolve(root) && !dir.startsWith(resolve(root) + sep)) fail(mpPath, `source of "${entry.name}" points outside the repo`);
    const rel = dir.slice(resolve(root).length + 1).split(sep).join('/');
    const pjPath = `${rel}/.claude-plugin/plugin.json`;
    if (!has(root, pjPath)) fail(pjPath, 'not found');
    const pj = json(root, pjPath);
    if (pj.name !== entry.name) fail(pjPath, `name "${pj.name}" differs from marketplace entry "${entry.name}"`);
    if (!pj.version) fail(pjPath, 'missing "version"');
    return { entry, pj, rel, pjPath };
  });

  const repo = resolveRepo(root, opts, manifests[0]?.pj.repository);
  const branch = opts.branch ?? 'main';
  const source = (path) => `https://github.com/${repo}/blob/${branch}/${path}`;
  const artifacts = [];
  const releases = [];
  const ids = new Set();
  const add = (a) => {
    if (ids.has(a.id)) fail(a.path, `duplicate artifact id "${a.id}"`);
    ids.add(a.id);
    artifacts.push(a);
  };

  for (const { entry, pj, rel, pjPath } of manifests) {
    const name = entry.name;
    const author = (typeof pj.author === 'string' ? pj.author : pj.author?.name) ?? mp.owner?.name ?? null;
    const compatSrc = has(root, `${rel}/COMPATIBILITY.md`) ? text(root, `${rel}/COMPATIBILITY.md`) : '';
    const compat = parseCompat(compatSrc);
    const hooksJson = has(root, `${rel}/hooks/hooks.json`) ? json(root, `${rel}/hooks/hooks.json`) : null;
    const hookEvents = hooksJson ? Object.entries(hooksJson.hooks ?? hooksJson) : [];
    const mcpJson = has(root, `${rel}/.mcp.json`) ? json(root, `${rel}/.mcp.json`) : null;
    const mcpServers = mcpJson ? Object.entries(mcpJson.mcpServers ?? mcpJson) : [];
    const security = { hooks: hookEvents.length > 0, mcp: mcpServers.length > 0, scripts: hasScripts(root, rel) };
    const tags = [...(entry.tags ?? pj.keywords ?? [])].sort();
    const common = {
      plugin: name,
      tags,
      category: entry.category ?? null,
      author,
      version: pj.version,
      dependencies: parseDependencies(pj.dependencies, pjPath),
      installCommand: `/plugin install ${name}@${mp.name}`,
      security,
      compat,
    };
    const pluginDate = gitDate(root, rel);
    const make = (type, aname, description, path, body, tools, date) => ({
      id: type === 'plugin' ? name : `${name}/${type}/${aname}`,
      type,
      name: aname,
      ...common,
      description,
      tools,
      path,
      sourceUrl: source(path),
      body,
      updatedAt: date ?? pluginDate,
    });

    const children = [];
    for (const dirName of list(root, `${rel}/skills`)) {
      const p = `${rel}/skills/${dirName}/SKILL.md`;
      if (!has(root, p)) continue;
      const { data, body } = parseFrontmatter(text(root, p), p);
      children.push(make('skill', data.name || dirName, data.description ?? '', p, body, toList(data.tools ?? data['allowed-tools']), gitDate(root, p)));
    }
    for (const [type, dir] of [['agent', 'agents'], ['command', 'commands']]) {
      for (const file of list(root, `${rel}/${dir}`).filter((f) => f.endsWith('.md'))) {
        const p = `${rel}/${dir}/${file}`;
        const { data, body } = parseFrontmatter(text(root, p), p);
        children.push(make(type, data.name || basename(file, '.md'), data.description ?? '', p, body, toList(data.tools), gitDate(root, p)));
      }
    }
    for (const [event, groups] of hookEvents) {
      const cmds = JSON.stringify(groups).match(/"command"\s*:\s*"([^"]*)"/g)?.map((c) => c.replace(/^"command"\s*:\s*"|"$/g, '')) ?? [];
      const p = `${rel}/hooks/hooks.json`;
      children.push(make('hook', event, `Runs on ${event}${cmds.length ? `: ${cmds.join(', ')}` : ''}`, p, '```json\n' + JSON.stringify({ [event]: groups }, null, 2) + '\n```', [], gitDate(root, p)));
    }
    for (const [server, cfg] of mcpServers) {
      const p = `${rel}/.mcp.json`;
      const run = [cfg.command, ...(cfg.args ?? [])].filter(Boolean).join(' ') || cfg.url || '';
      children.push(make('mcp', server, `MCP server${run ? `: ${run}` : ''}`, p, '```json\n' + JSON.stringify({ [server]: { ...cfg, env: undefined } }, null, 2) + '\n```', [], gitDate(root, p)));
    }
    children.sort((a, b) => a.id.localeCompare(b.id));

    const readme = has(root, `${rel}/README.md`) ? text(root, `${rel}/README.md`) : '';
    const plugin = make('plugin', name, pj.description ?? entry.description ?? '', `${rel}/README.md`, readme, [...new Set(children.flatMap((c) => c.tools))].sort(), pluginDate);
    plugin.children = children.map((c) => c.id);
    add(plugin);
    children.forEach(add);

    if (has(root, `${rel}/CHANGELOG.md`)) {
      for (const r of parseChangelog(text(root, `${rel}/CHANGELOG.md`))) {
        // Date order of preference: the changelog heading, then the commit that introduced this version. Never invented.
        const date = r.date ?? git(root, ['log', '--format=%cs', `-S"version": "${r.version}"`, '--', pjPath])?.split('\n').pop() ?? null;
        releases.push({ plugin: name, version: r.version, date, notes: r.notes });
      }
    }
  }

  artifacts.sort((a, b) => a.id.localeCompare(b.id));
  releases.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '') || a.plugin.localeCompare(b.plugin) || b.version.localeCompare(a.version, undefined, { numeric: true }));
  const stats = Object.fromEntries(TYPES.map((t) => [t === 'mcp' ? 'mcp' : t + 's', artifacts.filter((a) => a.type === t).length]));
  return {
    schemaVersion: 1,
    generatedAt: git(root, ['log', '-1', '--format=%cI']) ?? new Date().toISOString(),
    commit: git(root, ['rev-parse', '--short', 'HEAD']),
    marketplace: { name: mp.name, repo, description: mp.description ?? null },
    stats,
    artifacts,
    releases,
  };
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function buildFeeds(index, siteUrl) {
  const { marketplace: m } = index;
  const title = `${m.name}: releases`;
  const link = (r) => `${siteUrl}#/plugin/${encodeURIComponent(r.plugin)}`;
  const tag = (r) => `tag:github.com,${m.repo}:${r.plugin}@${r.version}`;
  const jsonFeed = {
    version: 'https://jsonfeed.org/version/1.1',
    title,
    home_page_url: siteUrl,
    feed_url: `${siteUrl}feed.json`,
    items: index.releases.map((r) => ({
      id: tag(r),
      url: link(r),
      title: `${r.plugin} ${r.version}`,
      content_text: r.notes || `${r.plugin} ${r.version}`,
      ...(r.date ? { date_published: `${r.date}T00:00:00Z` } : {}),
    })),
  };
  // Atom requires <updated> on every entry, so releases without a known date are left out of it.
  const atom =
    `<?xml version="1.0" encoding="utf-8"?>\n<feed xmlns="http://www.w3.org/2005/Atom">\n` +
    `  <title>${esc(title)}</title>\n  <id>${esc(siteUrl)}</id>\n  <updated>${esc(index.generatedAt)}</updated>\n` +
    `  <link href="${esc(siteUrl)}"/>\n  <link rel="self" href="${esc(siteUrl + 'feed.xml')}"/>\n` +
    index.releases
      .filter((r) => r.date)
      .map((r) => `  <entry>\n    <title>${esc(`${r.plugin} ${r.version}`)}</title>\n    <id>${esc(tag(r))}</id>\n    <updated>${r.date}T00:00:00Z</updated>\n    <link href="${esc(link(r))}"/>\n    <summary>${esc(r.notes)}</summary>\n  </entry>\n`)
      .join('') +
    `</feed>\n`;
  return { json: JSON.stringify(jsonFeed, null, 2) + '\n', atom };
}

function main() {
  const args = Object.fromEntries(
    process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith('--') ? [...acc, [a.slice(2), all[i + 1]]] : acc), []),
  );
  const root = resolve(args.root ?? process.cwd());
  const out = resolve(root, args.out ?? 'site/public');
  const index = buildIndex(root, { repo: args.repo, branch: args.branch });
  const [owner, name] = index.marketplace.repo.split('/');
  const siteUrl = (args['site-url'] ?? `https://${owner.toLowerCase()}.github.io/${name}/`).replace(/\/?$/, '/');
  const feeds = buildFeeds(index, siteUrl);
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  writeFileSync(join(out, 'feed.json'), feeds.json);
  writeFileSync(join(out, 'feed.xml'), feeds.atom);
  const plugins = index.artifacts.filter((a) => a.type === 'plugin').length;
  console.log(`index: ${plugins} plugin(s), ${index.artifacts.length - plugins} item(s), ${index.releases.length} release(s) -> ${out}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (e) {
    if (!(e instanceof IndexError)) throw e;
    console.error(`build-index: ${e.message}`);
    process.exit(1);
  }
}
