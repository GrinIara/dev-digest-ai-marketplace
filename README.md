# dev-digest-ai-marketplace

Claude Code plugin marketplace from Dev Digest.

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install <plugin>@dev-digest-ai-marketplace
```

If the repository is private, you need git credentials Claude Code can use without a prompt: `gh auth login` then `gh auth setup-git`, or an SSH key in `ssh-agent`.

## Update

Auto-update is off by default for third-party marketplaces. Turn it on in `/plugin` → Marketplaces, or update manually. There are two separate steps:

| Command | What it updates |
|---|---|
| `claude plugin marketplace update dev-digest-ai-marketplace` | The catalog: the list of plugins and their versions. Installed plugins do not change. |
| `claude plugin update <plugin>@dev-digest-ai-marketplace` | One installed plugin, to the version the catalog currently lists. |

Inside a session, the same actions are in the `/plugin` menu. `claude plugin install <plugin>@dev-digest-ai-marketplace` refreshes the catalog first. Changes take effect after `/reload-plugins` or a restart.

> Plugins can run hooks, MCP servers and scripts with your permissions. Review a plugin before installing it.

## Plugins

| Plugin | Description | Contents |
|---|---|---|
| [starter](plugins/starter) | Reference template plugin. Copy it to start a new plugin. | skill `hello`, agent `starter-helper` |

## Repository layout

```
.claude-plugin/marketplace.json   catalog of plugins
plugins/<name>/                   one directory per plugin
scripts/lint-marketplace.mjs      structural checks
.github/workflows/validate.yml    CI
```

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md). Copy `plugins/starter/` and follow [its README](plugins/starter/README.md#use-as-a-template).

## Checks

Run before opening a PR (CI runs the same):

```bash
claude plugin validate . --strict
node scripts/lint-marketplace.mjs --base origin/main
```

`claude plugin validate` checks schemas and frontmatter. `scripts/lint-marketplace.mjs` checks what it misses:

- source directories exist and entry names match `plugin.json`
- kebab-case names, semver versions, version bump on change
- README / CHANGELOG / COMPATIBILITY present and CODEOWNERS coverage
- no absolute paths or secrets, no unlisted plugin directories

CI also runs an install smoke test in an isolated config directory.

## Branch protection

Make CI a merge gate: GitHub → Settings → Branches (or Rules → Rulesets) → protect `main`:

- require a pull request before merging, with review from code owners
- require the status check `validate` (job of the `Validate marketplace` workflow) to pass
- block force pushes

For a private repository, branch protection and rulesets need a paid GitHub plan (Pro, Team or Enterprise). On GitHub Free they are available only for public repositories.
