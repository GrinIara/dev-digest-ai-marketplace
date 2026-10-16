# Plugin guidelines

How to build a plugin for `dev-digest-ai-marketplace`. `plugins/starter/` is the working reference; copy it to start.

## Layout

```
plugins/<name>/
├── .claude-plugin/
│   └── plugin.json        manifest only; nothing else goes in .claude-plugin/
├── skills/<skill>/SKILL.md
├── agents/<agent>.md
├── hooks/hooks.json       optional
├── .mcp.json              optional
├── README.md              what it does, contents table, install command
├── CHANGELOG.md           one "## <version>" section per release
└── COMPATIBILITY.md       Claude Code version, OS, external dependencies
```

Components live at the plugin root. Claude Code does not scan `.claude-plugin/` for them, and a `CLAUDE.md` in the plugin root is not loaded.

Prefer `skills/` over `commands/` for new plugins.

## Names

- Plugin names are kebab-case: `^[a-z0-9]+(-[a-z0-9]+)*$`.
- Do not start a name with `claude-`, `anthropic-` or `cc-plugin-`; `claude plugin validate` rejects these.
- The marketplace entry `name` must equal `name` in `plugin.json`. Otherwise install fails with `Plugin "<name>" not found`.
- Names never change after publishing: users reference them in `enabledPlugins` and install commands. Use `displayName` for the label. If a rename is unavoidable, add `"renames": { "<old>": "<new>" }` to `marketplace.json`.

## Manifest

```json
{
  "name": "my-plugin",
  "version": "0.1.0",
  "description": "One sentence: what it does and for whom.",
  "author": { "name": "GrinIara", "url": "https://github.com/GrinIara" },
  "repository": "https://github.com/GrinIara/dev-digest-ai-marketplace",
  "keywords": ["..."]
}
```

- `version` lives only in `plugin.json`, never in the marketplace entry. See [RELEASES.md](RELEASES.md).
- Component paths in the manifest start with `./`, stay inside the plugin and use forward slashes.

## Marketplace entry

```json
{
  "name": "my-plugin",
  "source": "./plugins/my-plugin",
  "description": "Same sentence as in plugin.json.",
  "category": "...",
  "tags": ["..."]
}
```

Only relative `./plugins/<name>` sources are allowed in this repo.

## Paths and files

- Installed plugins are copied to `~/.claude/plugins/cache/...`. Files outside the plugin directory are not copied, so never reference `../`.
- To share a file between plugins, use a symlink inside this repo; it is copied as a real file on install.
- `${CLAUDE_PLUGIN_ROOT}` is the installed plugin directory. It changes on every update: read from it, never write state to it.
- `${CLAUDE_PLUGIN_DATA}` persists across updates. Use it for caches and state.
- Quote the root in shell-form hooks: `"\"${CLAUDE_PLUGIN_ROOT}\"/scripts/run.sh"`. macOS paths can contain spaces.
- Run scripts through an interpreter (`bash "${CLAUDE_PLUGIN_ROOT}/x.sh"`, `node ...`) instead of relying on the executable bit, which can be lost on update.
- Do not use a top-level `bin/`; claude.ai org sync rejects plugins with it.

## Skills

- `name` equals the skill directory name; lowercase, digits and hyphens, at most 64 characters.
- `description` is third person, says what the skill does and then "Use when ...", at most 1024 characters. Put the key trigger words first: descriptions are shortened when many skills are installed.
- Keep `SKILL.md` under 500 lines; move long reference material to files next to it, one level deep.
- Set `disable-model-invocation: true` on skills with side effects (deploys, writes to external systems).

## Agents

Frontmatter needs `name` and `description`. Give the agent only the `tools` it needs.

## Referencing other plugins

Plugin components are namespaced by the plugin name: `<plugin>:<skill>` and `<plugin>:<agent>`, for example `/starter:hello`. When one plugin relies on another:

- Refer to its skills and agents by the full namespaced name, never the bare name. Bare names collide when two plugins ship a skill with the same name.
- Declare the dependency in `plugin.json` so it installs together:

  ```json
  "dependencies": [
    "other-plugin",
    { "name": "versioned-plugin", "version": "^1.2.0" }
  ]
  ```

  A bare name resolves within this marketplace. Pin a version range when you rely on specific behavior; ranges resolve against `<name>--v<version>` tags ([RELEASES.md](RELEASES.md#releasing-a-change)).
- Plugins from other marketplaces can be dependencies only if listed in `allowCrossMarketplaceDependenciesOn` in `marketplace.json`.
- Keep `strict` at its default `true` in marketplace entries: `plugin.json` stays the source of truth for components.
- List dependencies in the plugin's `COMPATIBILITY.md`.

## Runtime dependencies

- Node: dependencies are installed into the cache only when the plugin has `package.json` plus `package-lock.json`, `npm-shrinkwrap.json` or `bun.lock`. Install scripts never run, the timeout is 60 s, and yarn/pnpm lockfiles are ignored.
- Anything else (Python, native binaries): install from a hook into `${CLAUDE_PLUGIN_DATA}` and list it in `COMPATIBILITY.md`.

## Size

Keep plugins focused. Every installed skill description costs context on every turn, so several small plugins beat one large bundle.

## Before opening a PR

```bash
claude plugin validate . --strict
node scripts/lint-marketplace.mjs --base origin/main
```

Then install it locally from your checkout:

```
/plugin marketplace add ./
/plugin install <name>@dev-digest-ai-marketplace
```
