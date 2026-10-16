# Spec: Marketplace Site (GitHub Pages)

Status: **DRAFT, in review.** Nothing is implemented. Decisions from the first review are recorded in [Decisions](#decisions); [Open Questions](#open-questions) lists what is still unresolved.

## Objective

A static web app on GitHub Pages that lets people discover, evaluate and install anything shipped by `dev-digest-ai-marketplace`: plugins, skills, agents, commands, hooks and MCP servers.

**Users**

- Developers using Claude Code who want "a skill for X" and do not know what exists.
- New team members who need to connect the marketplace quickly.
- Plugin authors and maintainers who want to see the state of the catalog.

**Why:** the repo is the only source of truth, but reading `plugins/*` on GitHub is a poor way to search. The site turns the repo content into a searchable catalog with a copy-paste install path.

**Hard constraint:** GitHub Pages is static hosting. No server code, no database, no secrets at runtime, no accounts. Everything dynamic is either precomputed in CI or lives in the browser.

**Guiding principle:** explore first, standardise later. The site follows what the repo already contains and does not invent new metadata requirements for plugin authors in v1.

### Scope (v1 / MVP)

| # | Feature | Notes |
|---|---|---|
| F1 | Search across all repo content, results as cards | Keyword + fuzzy, UK/EN aware, no runtime LLM |
| F2 | Copy install on every card | Copies the `/plugin install ...` command |
| F3 | Detail view with deep link | `#/plugin/<name>`, rendered README / SKILL.md, frontmatter, tools, dependencies |
| F4 | Browse + facets | Type, keyword (tag), author, category |
| F5 | Command palette (Cmd/Ctrl+K) | Keyboard-first search and navigation |
| F6 | What's new | Release feed from CHANGELOG / version; JSON and RSS/Atom feed |
| F7 | Stats tile | Counts of plugins, skills, agents, etc., derived from the index |
| F8 | Onboarding "connect the marketplace" | Copy buttons, usable in about 30 seconds |
| F9 | Health and security badges | Compatibility from `COMPATIBILITY.md`, "has hooks / MCP / scripts" flags |

### Out of scope (v1)

- Ratings, likes, comments, download counters (need a backend or an external service).
- Semantic (embedding) search. Planned upgrade, see [Future](#future-not-v1).
- Dependency graph and Collections UI. The index schema reserves the fields.
- User accounts, anything stored server-side.
- UI localisation. The interface and all content are English (decided); search still understands Ukrainian queries through the synonym map.
- Changing the plugin authoring rules in `docs/PLUGIN-GUIDELINES.md`.

### Non-goals

The site never installs anything itself and never executes plugin code. It only shows information and copies commands.

## Tech Stack

Decided stack is marked **(decided)**; the rest are assumptions open for correction.

- **Site (decided):** React + Vite + TypeScript. Component-based and easy to grow. The cost is a larger bundle and more dependencies, so the JS budget in Success Criteria is enforced in CI.
- **Search:** MiniSearch (client-side, fuzzy, field boosts).
- **Search (decided):** fuzzy + keyword for v1 (MiniSearch). The index schema leaves room for embeddings later.
- **Markdown rendering:** `marked` + `DOMPurify` (README and SKILL.md are untrusted content from PRs).
- **Indexer:** Node 22 script, plain ESM `.mjs`, same style as `scripts/lint-marketplace.mjs`. Node 22 is already pinned in CI.
- **Routing:** hash routing with a small hand-written router (about 60 lines, `hashchange` + `URLSearchParams`, no library). Routes: `#/` (browse, with `?q=`, `type`, `tag`, `author`, `category`, `sort`), `#/plugin/<name>`, `#/artifact/<id>` (one scheme for every non-plugin artifact; `<id>` is `<plugin>/<type>/<name>`), `#/new`, `#/start`. An unknown route shows the Not found screen. GitHub Pages cannot rewrite paths, so path routing would break on refresh.
- **Search provider (decided):** search sits behind a small `SearchProvider` interface; v1 ships `KeywordProvider` (MiniSearch). A `SemanticProvider` can be added later without UI changes.
- **Hosting:** GitHub Pages via GitHub Actions (`actions/deploy-pages`). Project site, so it is served under a sub-path (`/dev-digest-ai-marketplace/`). The Vite `base` must be set accordingly.
- **Fonts / assets:** self-hosted, no third-party requests at runtime.
- **GitHub Pages:** `site/public/.nojekyll` is shipped so Pages serves every file as is.
- **UI text (decided):** every user-visible string (labels, headings, sentences, aria-labels, placeholders, error messages, the page title) lives in one typed file, `site/src/i18n/en.ts`, and components read it through `m` from `src/i18n`. Sentences that contain links or code are one message with `{name}` placeholders, filled by `rich()`, so a translation can reorder words. A second language is a second file with the same shape. `site/src/i18n/no-hardcoded-text.test.ts` parses the UI source and fails on any hard-coded text.

## Data Model: `index.json`

Built in CI from the repo, published next to the site. `index.json` is loaded once and searched in the browser. It carries only metadata and a short plain-text `bodyText` (at most 4 KB, markdown stripped); the full markdown of each artifact is written to `bodies/<id>.md` (the `/` in an id becomes `__`) and fetched only when a detail view opens. This keeps the index small as the catalog grows.

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-16T09:00:00Z",
  "commit": "e733511",
  "marketplace": { "name": "dev-digest-ai-marketplace", "repo": "GrinIara/dev-digest-ai-marketplace" },
  "stats": { "plugins": 1, "skills": 1, "agents": 1, "commands": 0, "hooks": 0, "mcp": 0 },
  "artifacts": [
    {
      "id": "starter/skill/hello",          // stable, unique
      "type": "skill",                      // plugin | skill | agent | command | hook | mcp
      "name": "hello",
      "plugin": "starter",
      "description": "Greets the user ...",
      "tags": ["template", "example"],
      "category": "template",
      "author": "GrinIara",
      "version": "0.1.0",
      "tools": ["Read", "Grep", "Glob"],    // from frontmatter `tools`, when present
      "dependencies": [],                   // [{ "name", "version", "marketplace"? }] from plugin.json; the graph UI is not in v1
      "installCommand": "/plugin install starter@dev-digest-ai-marketplace",
      "path": "plugins/starter/skills/hello/SKILL.md",
      "sourceUrl": "https://github.com/GrinIara/dev-digest-ai-marketplace/blob/main/plugins/starter/skills/hello/SKILL.md",
      "bodyText": "…plain text, max 4 KB…",   // markdown stripped; used for search only
      "bodyPath": "bodies/starter__skill__hello.md", // raw markdown, fetched lazily by the detail view
      "security": { "hooks": false, "mcp": false, "scripts": false },
      "compat": { "claudeCode": "2.1.301+", "os": ["macOS", "Linux", "Windows"] },
      "updatedAt": "2026-10-16"
    }
  ],
  "releases": [
    { "plugin": "starter", "version": "0.1.0", "date": null, "notes": "Initial template: ..." }
  ]
}
```

Sources the indexer reads:

| Source | Gives |
|---|---|
| `.claude-plugin/marketplace.json` | plugin list, category, tags, source path |
| `plugins/<n>/.claude-plugin/plugin.json` | version, description, author, keywords |
| `plugins/<n>/skills/*/SKILL.md` | skill frontmatter (`name`, `description`) + body |
| `plugins/<n>/agents/*.md`, `commands/*.md` | frontmatter (`name`, `description`, `tools`) + body |
| `plugins/<n>/hooks/hooks.json`, `.mcp.json` | hook / MCP entries and the security flags |
| `plugins/<n>/README.md`, `CHANGELOG.md`, `COMPATIBILITY.md` | detail view, releases, compat |

Rules:

- The indexer must tolerate missing optional files. Today `commands/`, `hooks/` and `.mcp.json` do not exist.
- Invalid or unparseable input fails the build with a message naming the file. It never produces a partial index silently.
- Output is deterministic (sorted keys and artifacts) so the diff of two runs is meaningful.
- Index size budget: under 1 MB gzipped up to about 200 artifacts. With full bodies embedded, five plugins already produce a 273 KB index (87 KB gzipped), so bodies are split out as described above.
- The indexer resolves every path from `--root`, which defaults to the repository root derived from the script's own location (`import.meta.url`), never from the current working directory.

## Search Behaviour (F1)

- Fields and weights: `name` (x5) > `tags` / `category` (x3) > `description` (x2) > `body` (x1).
- Fuzzy matching (edit distance about 0.2), prefix matching, case-insensitive.
- **Natural-language queries** ("I need a skill for reviewing PRs", or the same request typed in Ukrainian): strip stop words (English and Ukrainian), normalise word forms, and expand each term through a synonym map, so that "review", "code review" and their Ukrainian equivalents match the same artifacts, and likewise for "tests" and "testing". The Ukrainian vocabulary is search data only; the interface and all documentation stay English.
- The synonym map is a plain versioned JSON file in the repo (`site/src/search/synonyms.json`). Anyone can extend it in a PR.
- Query and filters are stored in the URL (`#/?q=...&type=skill`), so a result is shareable.
- Empty state shows suggestions, never a blank page.
- No runtime LLM and no API key anywhere in the client.
- Facets are a post-filter: AND between groups, OR inside a group.
- Matched terms are highlighted in the card name and description.

## Screens and Components (input for design)

### Screens

1. **Home / Browse** (`#/`)
   - Header: logo, search field (focus with `/`), Cmd/Ctrl+K hint, link to GitHub repo.
   - Hero strip with **Stats tile** (F7) and a short "Connect the marketplace" call to action (F8).
   - Facet sidebar (desktop) or filter sheet (mobile): type, tag, author, category. Counts per option.
   - Result grid of **cards**; sort: relevance (when a query exists), name, recently updated.
   - **What's new** strip: the latest 3 releases, link to the full feed (F6).
2. **Detail** (`#/plugin/<name>` and `#/artifact/<id>`)
   - Title, type badge, version, author, links to source on GitHub.
   - **Copy install** primary button.
   - Tabs or sections: Overview (rendered README / SKILL.md), What it includes (skills, agents, ...), Permissions (tools, hooks, MCP, scripts), Compatibility, Changelog.
   - "Related" artifacts (same plugin; same tags).
3. **What's new** (`#/new`): chronological releases, per-plugin filter, feed links (`feed.json`, `feed.xml`).
4. **Get started** (`#/start`): onboarding. Same content as the Home call to action, in full.
5. **Not found** (unknown route): friendly message, search field.
6. **Empty catalog** (home when `index.json` has no entries, for example when `plugins/` is empty): an explicit empty state that explains how to add a plugin, with a link to `CONTRIBUTING.md`. No demo data is shipped; the UI fills itself when plugins are added.

### Components

| Component | Contents | States to design |
|---|---|---|
| Search field | input, clear button, `/` and Cmd/Ctrl+K hints | idle, focus, typing, no results, error |
| Command palette | modal, input, grouped results, keyboard nav | closed, open, loading, empty, no match |
| Artifact card | type badge, name, plugin, description (2 lines, highlighted match), tags, version, security badge, **Copy install** | default, hover, focus, copied, long text |
| Facet group | checkbox list with counts, clear | collapsed, expanded, disabled (0 results) |
| Stats tile | counts per type, last updated, validation status | populated, single item, zero |
| Release item | plugin, version, date (if known), notes, link to detail | with date, without date |
| Onboarding steps | 3 steps with copy buttons (below) | default, copied |
| Badges | type (plugin/skill/agent/command/hook/MCP), security ("hooks", "MCP", "scripts"), compat ("Claude Code 2.1.301+") | each variant |
| Code block with copy | monospace, copy button, "Copied" confirmation | default, copied, copy failed |

### Onboarding content (F8)

```
1. Add the marketplace   /plugin marketplace add GrinIara/dev-digest-ai-marketplace
2. Install a plugin      /plugin install <plugin>@dev-digest-ai-marketplace
3. Reload                /reload-plugins
```

A note repeats the repo warning: plugins can run hooks, MCP servers and scripts with your permissions, so review before installing. A private-repo note links to `docs/SECURITY.md` if access is restricted (see Open Questions).

### Stats tile (F7)

Shows total plugins, skills, agents, commands, hooks, MCP servers, plus "updated <date>" and the result of the last CI validation. Counts come only from `index.json`. When the catalog is tiny (one plugin today) the tile still reads well: show zeros as muted, not hidden.

### What's new (F6)

- Entries come from each plugin's `CHANGELOG.md` (`## <version>` sections).
- Date: supported as `## 0.1.0 - 2026-10-16`. If the changelog has no date, fall back to the git commit date of the version bump. If neither is available, show the version without a date. Never invent a date.
- Feeds: `feed.json` (JSON Feed 1.1) and `feed.xml` (Atom), generated by the indexer.

### Design requirements

- Dev-first look: dense but calm, monospace for commands, light and dark themes (follow `prefers-color-scheme`, manual toggle).
- Responsive: usable from 360 px wide. Facets collapse into a sheet on mobile.
- Accessibility target: WCAG 2.2 AA. Full keyboard operation, visible focus, `aria-live` for result counts and "Copied", palette follows the dialog pattern (focus trap, Esc closes), respects `prefers-reduced-motion`.
- Contrast and badge colors never convey meaning by color alone.
- Design tokens (color, spacing, type scale, radius) are defined once as CSS variables so the design can be handed over cleanly.

## Commands

The site lives in `site/` with its own `package.json`; the indexer lives next to the existing script. `dev`, `build` and `preview` run the indexer first (npm `pre` scripts), so a fresh clone never gets a 404 for `index.json`.

```
Install:        cd site && npm ci
Build index:    node scripts/build-index.mjs --root . --out site/public
Dev:            cd site && npm run dev          (runs the indexer first)
Build site:     cd site && npm run build        (runs the indexer, typechecks, builds to site/dist)
Preview:        cd site && npm run preview      (runs the indexer, serves the production build under the real base path)
Unit tests:     cd site && npm test
Index tests:    node --test scripts/
E2E:            cd site && npm run e2e
Typecheck:      cd site && npm run typecheck
Lint:           cd site && npm run lint
Repo lint:      node scripts/lint-marketplace.mjs          (existing, unchanged)
Official check: claude plugin validate . --strict          (existing CI step)
```

Exact script names are fixed when the plan is written.

## Project Structure

```
.claude-plugin/marketplace.json   catalog (existing, source of truth)
plugins/<name>/                   plugins (existing)
scripts/
  lint-marketplace.mjs            existing structural lint
  build-index.mjs                 NEW: repo -> index.json + bodies/ + feeds
  build-index.test.mjs            NEW: node:test fixtures-based tests
  fixtures/                       NEW: tiny fake marketplaces for tests
site/                             NEW: the web app
  src/
    main.ts                       entry, router
    router.ts                     hash routing (about 60 lines, no library)
    search/                       SearchProvider interface, KeywordProvider (MiniSearch), synonyms.json, query normalisation
    views/                        home, detail, new, start, not-found
    components/                   card, facets, palette, stats, badges, code-copy
    lib/                          markdown (sanitised), clipboard, url-state
    styles/                       tokens.css, base.css, components
  public/                         generated index.json, bodies/, feeds (not committed); .nojekyll (committed)
  tests/                          unit tests; e2e/ for Playwright
.github/workflows/
  validate.yml                    existing, unchanged
  site.yml                        NEW: PR build-check; build + deploy to Pages on main
docs/SITE.md                      NEW: how the site is built and how to extend synonyms
SPEC.md                           this file
```

Generated files (`index.json`, feeds, `site/dist`) are build outputs and are git-ignored.

## Code Style

Match the existing `scripts/lint-marketplace.mjs`: ESM, `node:` imports, small pure functions, early failure with a precise message.

```js
// scripts/build-index.mjs (style reference)
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const fail = (file, msg) => {
  throw new Error(`${relative(process.cwd(), file)}: ${msg}`);
};

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (e) {
    return fail(path, `cannot parse JSON (${e.message})`);
  }
}
```

```ts
// site/src: style reference
export function buildInstallCommand(plugin: string, marketplace: string): string {
  return `/plugin install ${plugin}@${marketplace}`;
}
```

Conventions: TypeScript `strict`, kebab-case file names, no default exports, no `any`, no inline styles (tokens via CSS variables), comments only for non-obvious "why". Markdown from the repo is always sanitised before insertion into the DOM; never use raw `innerHTML` with unsanitised content.

## Testing Strategy

| Level | Tool | What |
|---|---|---|
| Indexer unit | `node --test` + fixtures | frontmatter parsing, missing optional files, malformed JSON fails loudly, deterministic output, release parsing and date fallback, security flags |
| UI text guard | Vitest + parser | no readable text in components, views or lib files outside `src/i18n/en.ts`; `index.html` title and description match the messages |
| Search unit | Vitest | weights, fuzzy, UK/EN synonyms, stop words, empty query, URL state round trip |
| Component | Vitest + DOM | card, facets, copy button states, palette keyboard nav |
| E2E | Playwright on the built site under the real base path | search to card to detail, deep link refresh, Cmd/Ctrl+K, copy install writes the expected string, onboarding copy, what's new |
| Accessibility | axe in Playwright | zero serious/critical violations on every screen, both themes |
| Performance | Lighthouse CI on the built site | see success criteria |

The indexer test fixtures include an **empty marketplace** and a **marketplace with every artifact type**, because the catalog must work from zero plugins up.

Manual verification before the first release (nothing fake is committed):

1. **Empty state.** With an empty `plugins/` and `plugins: []`, run `npm run build`; the index has no entries, and the built site shows the Empty catalog screen.
2. **Populated UI with a scratch plugin.** Create a temporary `plugins/_scratch-verify/` (manifest, one skill, one agent, README, CHANGELOG), run the indexer, and check entries, stats, releases and bodies; open the browse, search, plugin and artifact deep links. Delete it afterwards and confirm `git status` shows no scratch or generated files.
3. **Production parity.** `npm run build && npm run preview`, then open the preview under `/dev-digest-ai-marketplace/` and load the deep links directly, to prove the base path and hash routes work.

## Success Criteria

- Searching "skill for hello" or the UK equivalent returns the `hello` skill card first.
- A search of 200 artifacts responds in under 100 ms after the index is loaded (measured in a unit test with a generated 200-artifact index).
- Every card has a working Copy install; the copied string is exactly `/plugin install <plugin>@dev-digest-ai-marketplace`.
- A detail URL opened directly or refreshed under `/dev-digest-ai-marketplace/` renders the right page, in `npm run preview` as well as on Pages.
- With no plugins, the site shows the Empty catalog screen and no error.
- The site builds and deploys from `main` with no manual step, and a PR that breaks the index fails CI before merge.
- JS shipped excluding `index.json`: at most 100 KB gzipped. Lighthouse (mobile): Performance >= 90, Accessibility >= 95, Best Practices >= 95.
- Zero third-party runtime requests (verified in E2E).
- Adding a new plugin that follows `docs/PLUGIN-GUIDELINES.md` makes it appear on the site after merge with no site code change.
- A fresh user can go from the site home page to an installed plugin command in 3 copy actions.

## Boundaries

**Always**

- Treat all repo content as untrusted when rendering (sanitise markdown, escape text).
- Fail the index build on malformed input, naming the file.
- Keep the site working with zero plugins and with plugins missing optional files.
- Run indexer tests, site tests and the existing `validate.yml` checks before merging.
- Pin GitHub Actions and Node versions as `validate.yml` already does.
- Keep keyboard and screen-reader support in every new component.

**Ask first**

- Adding any runtime dependency to `site/` beyond React, MiniSearch, `marked` and `DOMPurify` (the marketplace's own guidance is to review dependencies).
- Changing `docs/PLUGIN-GUIDELINES.md` or requiring new metadata from plugin authors.
- Changing `validate.yml` or the Pages / repository settings.
- Replacing React or sharding the index.
- Calling any external API from the browser (for example GitHub stats).

**Never**

- Put secrets, API keys or tokens in the client or the index.
- Execute or evaluate plugin content in the browser.
- Load third-party scripts, fonts or analytics at runtime.
- Write user-visible text in a component, view or lib file instead of `src/i18n/en.ts`.
- Commit generated `index.json`, feeds or build output.
- Edit plugin files from the site build.
- Skip or weaken failing tests or the validator to get a deploy through.

## Future (not v1)

- Semantic search: embeddings precomputed in CI, cosine similarity in the browser (upgrade over keyword search, needs a secret in CI only).
- Collections (curated sets, static config) and the dependency graph, using the reserved `dependencies` field.
- Compare view, bookmarks / "my set" in `localStorage` with a combined install command.
- Plugin generator and in-browser validator for contributors.

## Decisions

Recorded 2026-10-16 after the first review.

| # | Question | Decision |
|---|---|---|
| 1 | Public or private repo | **Public.** Pages is available and the site is public. |
| 2 | UI language | **English** for the interface and all content. |
| 3 | Stack | **React + Vite**, search is **fuzzy + keyword** in v1. |
| 4 | Changelog dates | **Adopt** `## 0.1.0 - YYYY-MM-DD`. Optional; git date is the fallback. |
| 5 | Site URL | Default project URL, `https://grininara.github.io/dev-digest-ai-marketplace/`. |
| 6 | Design | **Design system first**, then all key screens as one interactive prototype. Dark theme by default, light as an option, a single version. The prototype must be directly implementable. |
| 7 | Items taken from the second site plan | (1) full markdown in `bodies/<id>.md` with a 4 KB `bodyText` in the index; (2) `SearchProvider` interface; (3) `.nojekyll` in `public/`; (4) indexer paths from `import.meta.url` / `--root`; (5) `dev`, `build`, `preview` run the indexer first; (6) a PR build-check; (7) empty-state screen and the scratch-plugin and preview verification; (8) one `#/artifact/<id>` route. Where the plan disagreed with decisions 1–6 (Ukrainian UI, Google Fonts, feeds deferred, no badges, no 404, lighter tests, Node 20), this spec wins. |

## Indexing and build

### What is indexed

The indexer starts from `.claude-plugin/marketplace.json`. Only plugins **listed there** with a relative `source` inside the repository are indexed; a directory under `plugins/` that is not listed is ignored (and `lint-marketplace` already fails it).

For every listed plugin it reads:

| Indexed | From | Becomes |
|---|---|---|
| The plugin | `plugin.json` (version, description, author, keywords), marketplace entry (category, tags), `README.md` | one `plugin` entry |
| Skills | `skills/*/SKILL.md` (frontmatter and body) | one `skill` entry each |
| Agents and commands | `agents/*.md`, `commands/*.md` (frontmatter and body) | one entry each |
| Hooks | `hooks/hooks.json` | one `hook` entry per event; the commands are shown in the description |
| MCP servers | `.mcp.json` | one `mcp` entry per server; `env` values are removed |
| Releases | `CHANGELOG.md` headings (`## 1.2.0 - 2026-10-14`); a missing date falls back to the git commit that introduced the version | release feed |
| Compatibility | `COMPATIBILITY.md` table (Claude Code version, OS) | badges |
| Security flags | presence of hooks, MCP servers, and script files | badges |
| Update date | `git log` of each file (CI checks out full history for this) | "updated" |

### What is not indexed

- Plugins that are not in `marketplace.json`.
- Supporting files of a skill: `references/`, `rules/`, `examples`, `assets/`. Only `SKILL.md` is searchable; the rest stays on GitHub.
- Components declared outside the default folders through `plugin.json` paths, hooks or MCP servers declared inline in `plugin.json`, and agents in sub-folders (the scan is not recursive).
- Output styles, LSP servers, monitors, workflows, themes (no artifact type for them yet).
- Branches and pull requests: the site shows `main` as of the last successful deploy.

### How it is kept fresh

The browser never reads the repository. The index is a snapshot built in CI.

1. A change to `plugins/**`, `.claude-plugin/**`, `scripts/**`, `site/**` or the workflow, merged to `main`, starts the **Site** workflow. `workflow_dispatch` runs it by hand. Changes to files outside those paths (for example the root `README.md` or `docs/`) do not rebuild the site.
2. The workflow rebuilds the index from the checkout, builds the site, tests it and publishes it. Nothing has to be re-indexed by hand.
3. A pull request runs the same build and tests but never deploys.
4. If the indexer fails (unparseable manifest, duplicate id), the build stops. **The previously deployed site stays live**; a broken index is never published.

### Where the build runs

On GitHub's hosted runner (`ubuntu-latest`) inside GitHub Actions, in the **Site** workflow (`site.yml`), which is separate from the plugin checks in `validate.yml`. Each job is its own line in the pull request's Checks list:

1. **Tests** (`tests`): indexer tests, TypeScript type check, site unit tests including the UI text guard. No build needed.
2. **Build site** (`build`): check out with full history → Node 22 → `npm ci` in `site/` → `npm run build` (indexer, type check, Vite build to `site/dist`) → add the design prototype → write a build summary (commit, catalog counts, size) → upload `site/dist` as the Pages artifact. This job is only the build, so its green or red status answers one question: does the site compile from what is in the repository.
3. **End-to-end tests** (`e2e`, starts after Build site): install Chromium and run the Playwright tests against the production build; on failure the report is uploaded.
4. **Deploy to GitHub Pages** (`deploy`, push to `main` and manual runs only, and only when Tests, Build site and End-to-end tests all passed): publish the artifact to the `github-pages` environment. The site is served from the Pages CDN at `https://grininara.github.io/dev-digest-ai-marketplace/`.

Locally, `cd site && npm run dev` runs the indexer and starts Vite. One-time repository setup: Settings → Pages → Build and deployment → Source = **GitHub Actions**.

### Indexer fixes (found and fixed 2026-10-16)

Found by running the indexer on a branch with the new plugins, fixed in `scripts/build-index.mjs`, each with a test in `scripts/build-index.test.mjs`:

1. **Nested frontmatter** such as `metadata:` with indented keys (used by `fastify-best-practices`) no longer fails the build; only top-level keys are read. A non-indented list item is still an error.
2. **Plugin dependencies** are read from `plugin.json` into `dependencies` as `[{ "name", "version" | null, "marketplace"? }]`, so the site can show what a plugin depends on.
3. **The scripts flag** now ignores `references/`, `assets/` and `examples/` and counts `.js`, `.mjs`, `.cjs` and `.ts` files only when they start with a shebang. A `scripts/` or `bin/` folder, and `.sh`, `.py`, `.rb`, `.ps1` files, still count.

### Still open

- A plugin entry whose `source` is not a relative string (github, url, npm) stops the whole indexer. It should produce a minimal entry from the marketplace metadata and a warning.

## Open Questions

1. **Release and rollback of the site:** which scripts are worth having (smoke check after deploy, redeploy of a previous ref)? To be answered in the plan.
2. **`docs/` is git-ignored** (`.gitignore` lists it as private team docs, although some files in it are tracked). `docs/SITE.md` would need `git add -f`, or the site docs should live elsewhere. Decide before the plan.
3. **Design handoff:** the prototype lives as a Claude design canvas. Should its stylesheet and markup also be committed to the repo for reference, or only referenced by link?
