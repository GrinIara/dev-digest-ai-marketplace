#!/usr/bin/env node
// Structural checks that `claude plugin validate` does not cover.
// Usage: node scripts/lint-marketplace.mjs [--base <git-ref>]
// With --base, plugins changed since that ref must bump their plugin.json version.

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const SEMVER = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;
const ABSOLUTE_PATH = /(\/Users\/[^/\s]+|\/home\/[^/\s]+|[A-Za-z]:\\Users\\)/;
const SECRETS = [
  /AKIA[0-9A-Z]{16}/,
  /gh[pousr]_[A-Za-z0-9]{36,}/,
  /github_pat_[A-Za-z0-9_]{40,}/,
  /sk-ant-[A-Za-z0-9_-]{20,}/,
  /sk-[A-Za-z0-9]{32,}/,
  /xox[abpr]-[A-Za-z0-9-]{10,}/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
];
const TEXT_EXT = /\.(md|json|ya?ml|js|mjs|cjs|ts|sh|py|txt|toml)$/;

const errors = [];
const fail = (msg) => errors.push(msg);

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    fail(`${relative(ROOT, path)}: cannot parse JSON (${e.message})`);
    return null;
  }
}

function frontmatter(path) {
  const text = readFileSync(path, 'utf8');
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (kv) fields[kv[1]] = kv[2].trim();
  }
  return fields;
}

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function parseArgs() {
  const i = process.argv.indexOf('--base');
  return { base: i > -1 ? process.argv[i + 1] : null };
}

const { base } = parseArgs();
const marketplace = readJson(join(ROOT, '.claude-plugin/marketplace.json'));
if (!marketplace) {
  console.error(errors.join('\n'));
  process.exit(1);
}

if (!KEBAB.test(marketplace.name ?? '')) fail(`marketplace name "${marketplace.name}" is not kebab-case`);

const codeowners = existsSync(join(ROOT, '.github/CODEOWNERS'))
  ? readFileSync(join(ROOT, '.github/CODEOWNERS'), 'utf8')
  : '';
if (!codeowners) fail('.github/CODEOWNERS is missing');

const seen = new Set();
const listedDirs = new Set();

for (const entry of marketplace.plugins ?? []) {
  const label = `plugin "${entry.name}"`;

  if (!KEBAB.test(entry.name ?? '')) fail(`${label}: name is not kebab-case`);
  if (seen.has(entry.name)) fail(`${label}: duplicate entry`);
  seen.add(entry.name);

  if (typeof entry.source !== 'string') {
    fail(`${label}: only relative "./plugins/<name>" sources are allowed in this marketplace`);
    continue;
  }
  const expected = `./plugins/${entry.name}`;
  if (entry.source !== expected) fail(`${label}: source must be "${expected}", got "${entry.source}"`);

  const dir = join(ROOT, entry.source);
  listedDirs.add(relative(ROOT, dir));
  if (!existsSync(dir)) {
    fail(`${label}: source directory ${entry.source} does not exist`);
    continue;
  }

  if (!entry.description) fail(`${label}: marketplace entry has no description`);
  if (entry.version) fail(`${label}: set version only in plugin.json, not in the marketplace entry`);

  const manifestPath = join(dir, '.claude-plugin/plugin.json');
  if (!existsSync(manifestPath)) {
    fail(`${label}: missing .claude-plugin/plugin.json`);
    continue;
  }
  const manifest = readJson(manifestPath);
  if (!manifest) continue;

  if (manifest.name !== entry.name) {
    fail(`${label}: plugin.json name "${manifest.name}" must equal the marketplace entry name`);
  }
  if (!SEMVER.test(manifest.version ?? '')) fail(`${label}: plugin.json version must be semver, got "${manifest.version}"`);

  for (const doc of ['README.md', 'CHANGELOG.md', 'COMPATIBILITY.md']) {
    if (!existsSync(join(dir, doc))) fail(`${label}: missing ${doc}`);
  }
  const changelog = join(dir, 'CHANGELOG.md');
  if (existsSync(changelog) && manifest.version && !readFileSync(changelog, 'utf8').includes(`## ${manifest.version}`)) {
    fail(`${label}: CHANGELOG.md has no "## ${manifest.version}" section`);
  }

  if (!codeowners.split('\n').some((line) => line.trim().startsWith(`/plugins/${entry.name}/`))) {
    fail(`${label}: no CODEOWNERS line for /plugins/${entry.name}/`);
  }

  const skillsDir = join(dir, 'skills');
  if (existsSync(skillsDir)) {
    for (const skill of readdirSync(skillsDir)) {
      const skillFile = join(skillsDir, skill, 'SKILL.md');
      if (!existsSync(skillFile)) {
        fail(`${label}: skills/${skill} has no SKILL.md`);
        continue;
      }
      const fm = frontmatter(skillFile);
      if (!fm) fail(`${label}: skills/${skill}/SKILL.md has no frontmatter`);
      else {
        if (fm.name !== skill) fail(`${label}: skills/${skill}/SKILL.md name "${fm.name}" must equal its directory name`);
        if (!fm.description) fail(`${label}: skills/${skill}/SKILL.md has no description`);
      }
    }
  }

  const agentsDir = join(dir, 'agents');
  if (existsSync(agentsDir)) {
    for (const agent of readdirSync(agentsDir).filter((f) => f.endsWith('.md'))) {
      const fm = frontmatter(join(agentsDir, agent));
      if (!fm?.name || !fm?.description) fail(`${label}: agents/${agent} needs name and description in frontmatter`);
    }
  }

  for (const file of walk(dir).filter((f) => TEXT_EXT.test(f))) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(ROOT, file);
    if (ABSOLUTE_PATH.test(text)) fail(`${rel}: contains an absolute user path; use \${CLAUDE_PLUGIN_ROOT} or a relative path`);
    if (SECRETS.some((re) => re.test(text))) fail(`${rel}: looks like it contains a secret`);
  }

  if (base) {
    const changed = git('diff', '--name-only', `${base}...HEAD`, '--', relative(ROOT, dir));
    if (changed) {
      let baseVersion = null;
      try {
        baseVersion = JSON.parse(git('show', `${base}:${relative(ROOT, manifestPath)}`)).version;
      } catch {
        // New plugin: nothing to compare against.
      }
      if (baseVersion && baseVersion === manifest.version) {
        fail(`${label}: files changed since ${base} but plugin.json version is still ${manifest.version}`);
      }
    }
  }
}

if (existsSync(join(ROOT, 'plugins'))) {
  for (const name of readdirSync(join(ROOT, 'plugins'))) {
    const rel = join('plugins', name);
    if (statSync(join(ROOT, rel)).isDirectory() && !listedDirs.has(rel)) {
      fail(`${rel}: directory is not listed in marketplace.json`);
    }
  }
}

if (errors.length) {
  console.error(`✘ ${errors.length} problem(s):\n${errors.map((e) => `  - ${e}`).join('\n')}`);
  process.exit(1);
}
console.log(`✔ ${seen.size} plugin(s) passed structural checks`);
