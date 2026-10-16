import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { buildFeeds, buildIndex, IndexError, parseChangelog, parseCompat, parseDependencies, parseFrontmatter } from './build-index.mjs';

function repo(files) {
  const root = mkdtempSync(join(tmpdir(), 'idx-'));
  for (const [p, c] of Object.entries(files)) {
    mkdirSync(dirname(join(root, p)), { recursive: true });
    writeFileSync(join(root, p), typeof c === 'string' ? c : JSON.stringify(c));
  }
  return root;
}
const base = (extra = {}) => ({
  '.claude-plugin/marketplace.json': { name: 'mp', owner: { name: 'Me' }, plugins: [{ name: 'p', source: './plugins/p', category: 'cat', tags: ['b', 'a'] }] },
  'plugins/p/.claude-plugin/plugin.json': { name: 'p', version: '1.0.0', description: 'Plugin P', author: { name: 'Me' } },
  ...extra,
});
const opts = { repo: 'me/mp' };

test('an empty marketplace gives an empty catalog, nothing invented', () => {
  const root = repo({ '.claude-plugin/marketplace.json': { name: 'mp', plugins: [] } });
  const idx = buildIndex(root, opts);
  assert.deepEqual(idx.artifacts, []);
  assert.deepEqual(idx.releases, []);
  assert.equal(idx.stats.plugins, 0);
});

test('indexes a plugin with skill, agent, command, hook and MCP', () => {
  const root = repo(base({
    'plugins/p/skills/s/SKILL.md': '---\nname: s\ndescription: >\n  Does a thing.\n  Use when X.\n---\n# S\nbody',
    'plugins/p/agents/a.md': '---\nname: a\ndescription: An agent\ntools: Read, Grep\n---\nbody',
    'plugins/p/commands/c.md': '---\ndescription: A command\n---\nbody',
    'plugins/p/hooks/hooks.json': { hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'bash x.sh' }] }] } },
    'plugins/p/.mcp.json': { mcpServers: { gh: { command: 'npx', args: ['gh-mcp'], env: { TOKEN: 'secret' } } } },
    'plugins/p/scripts/x.sh': 'echo',
  }));
  const idx = buildIndex(root, opts);
  const byId = Object.fromEntries(idx.artifacts.map((a) => [a.id, a]));
  assert.deepEqual(Object.keys(byId).sort(), ['p', 'p/agent/a', 'p/command/c', 'p/hook/PreToolUse', 'p/mcp/gh', 'p/skill/s']);
  assert.equal(byId['p/skill/s'].description, 'Does a thing. Use when X.');
  assert.deepEqual(byId['p/agent/a'].tools, ['Read', 'Grep']);
  assert.equal(byId['p/command/c'].name, 'c');
  assert.deepEqual(byId.p.security, { hooks: true, mcp: true, scripts: true });
  assert.deepEqual(byId.p.tags, ['a', 'b']);
  assert.equal(byId.p.installCommand, '/plugin install p@mp');
  assert.equal(byId.p.sourceUrl, 'https://github.com/me/mp/blob/main/plugins/p/README.md');
  assert.deepEqual(idx.stats, { plugins: 1, skills: 1, agents: 1, commands: 1, hooks: 1, mcp: 1 });
  assert.ok(!JSON.stringify(idx).includes('secret'), 'MCP env values must not be published');
});

test('output is deterministic', () => {
  const root = repo(base({ 'plugins/p/skills/s/SKILL.md': '---\nname: s\ndescription: d\n---\n' }));
  assert.equal(JSON.stringify(buildIndex(root, opts)).replace(/"generatedAt":"[^"]*"/, ''), JSON.stringify(buildIndex(root, opts)).replace(/"generatedAt":"[^"]*"/, ''));
});

test('release dates come from the changelog and are null when unknown', () => {
  const root = repo(base({ 'plugins/p/CHANGELOG.md': '# Changelog\n\n## 1.0.0 - 2026-01-02\n\n- Added `x`.\n\n## 0.9.0\n\n- Old.\n' }));
  const { releases } = buildIndex(root, opts);
  assert.deepEqual(releases, [
    { plugin: 'p', version: '1.0.0', date: '2026-01-02', notes: 'Added x.' },
    { plugin: 'p', version: '0.9.0', date: null, notes: 'Old.' },
  ]);
});

test('invalid input fails and names the file', () => {
  assert.throws(() => buildIndex(repo(base({ 'plugins/p/.claude-plugin/plugin.json': '{nope' })), opts), (e) => e instanceof IndexError && e.message.includes('plugins/p/.claude-plugin/plugin.json'));
  assert.throws(() => buildIndex(repo(base({ 'plugins/p/.claude-plugin/plugin.json': { name: 'other', version: '1.0.0' } })), opts), /differs from marketplace entry/);
  assert.throws(() => buildIndex(repo(base({ 'plugins/p/.claude-plugin/plugin.json': { name: 'p' } })), opts), /missing "version"/);
  assert.throws(() => buildIndex(repo(base({ 'plugins/p/hooks/hooks.json': 'oops' })), opts), /hooks\.json/);
  assert.throws(() => buildIndex(repo({ '.claude-plugin/marketplace.json': { name: 'mp', plugins: [{ name: 'p', source: '../x' }] } }), opts), /outside the repo/);
});

test('compat is null when not stated', () => {
  assert.deepEqual(parseCompat(''), { claudeCode: null, os: null });
  assert.deepEqual(parseCompat('| Claude Code | 2.1.301 or later |\n| OS | macOS, Linux and Windows |'), { claudeCode: '2.1.301+', os: ['macOS', 'Linux', 'Windows'] });
});

test('frontmatter and changelog helpers', () => {
  assert.deepEqual(parseFrontmatter('---\nname: "x y"\n---\nb', 'f').data, { name: 'x y' });
  assert.throws(() => parseFrontmatter('---\n- bad\n---\n', 'f.md'), /f\.md/);
  assert.equal(parseChangelog('## [2.0.0] - 2026-02-03\n- a\n- b')[0].notes, 'a b');
});

test('Atom skips undated releases, JSON Feed omits date_published', () => {
  const idx = { generatedAt: '2026-01-01T00:00:00Z', marketplace: { name: 'mp', repo: 'me/mp' }, releases: [{ plugin: 'p', version: '1.0.0', date: null, notes: 'n' }, { plugin: 'p', version: '0.9.0', date: '2026-01-01', notes: 'a & b' }] };
  const f = buildFeeds(idx, 'https://x.test/');
  assert.equal((f.atom.match(/<entry>/g) ?? []).length, 1);
  assert.ok(f.atom.includes('a &amp; b'));
  const j = JSON.parse(f.json);
  assert.equal(j.items[0].date_published, undefined);
  assert.equal(j.items[1].date_published, '2026-01-01T00:00:00Z');
});

test('frontmatter with a nested metadata block does not fail the build', () => {
  const fm = '---\nname: fastify\ndescription: "Guides Fastify."\nmetadata:\n  tags: fastify, nodejs\n  version: "1"\nallowed-tools:\n  - Read\n---\nbody';
  const { data, body } = parseFrontmatter(fm, 'SKILL.md');
  assert.equal(data.name, 'fastify');
  assert.equal(data.description, 'Guides Fastify.');
  assert.equal(body, 'body');
  const root = repo(base({ 'plugins/p/skills/f/SKILL.md': fm }));
  assert.equal(buildIndex(root, opts).artifacts.find((a) => a.id === 'p/skill/fastify').description, 'Guides Fastify.');
  assert.throws(() => parseFrontmatter('---\n- not a key\n---\n', 'SKILL.md'), /SKILL\.md/);
});

test('plugin dependencies are read from plugin.json', () => {
  assert.deepEqual(parseDependencies(undefined, 'f'), []);
  assert.deepEqual(
    parseDependencies(['a', 'b@other', { name: 'c', version: '^1.0.0' }, { name: 'd', marketplace: 'm' }], 'f'),
    [
      { name: 'a', version: null },
      { name: 'b', version: null, marketplace: 'other' },
      { name: 'c', version: '^1.0.0' },
      { name: 'd', version: null, marketplace: 'm' },
    ],
  );
  assert.throws(() => parseDependencies('nope', 'plugin.json'), /plugin\.json.*array/);
  assert.throws(() => parseDependencies([{ version: '1' }], 'plugin.json'), /invalid dependency/);
  const root = repo(base({ 'plugins/p/.claude-plugin/plugin.json': { name: 'p', version: '1.0.0', dependencies: [{ name: 'dep', version: '^1.0.0' }] } }));
  const idx = buildIndex(root, opts);
  assert.deepEqual(idx.artifacts.find((a) => a.id === 'p').dependencies, [{ name: 'dep', version: '^1.0.0' }]);
});

test('the scripts flag ignores reference and example code but sees real scripts', () => {
  const flag = (files) => buildIndex(repo(base(files)), opts).artifacts.find((a) => a.id === 'p').security.scripts;
  assert.equal(flag({}), false);
  assert.equal(flag({ 'plugins/p/skills/s/references/types.ts': 'export type A = string;' }), false, 'a .ts sample in references/ is not a script');
  assert.equal(flag({ 'plugins/p/skills/s/examples/demo.js': 'console.log(1)' }), false);
  assert.equal(flag({ 'plugins/p/tools/helper.js': 'module.exports = 1;' }), false, 'a .js file without a shebang is a code sample');
  assert.equal(flag({ 'plugins/p/tools/run.mjs': '#!/usr/bin/env node\nconsole.log(1)' }), true, 'a shebang makes it a script');
  assert.equal(flag({ 'plugins/p/skills/s/run.sh': 'echo' }), true);
  assert.equal(flag({ 'plugins/p/scripts/x.txt': 'x' }), true, 'a scripts/ folder counts');
});
