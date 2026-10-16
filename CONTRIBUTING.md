# Contributing

Changes reach every user of the marketplace on their next update, so every change goes through a PR and CI.

## Add a plugin

1. **Scope.** One plugin solves one problem. Check the plugin table in `README.md` that nothing similar exists; extend an existing plugin instead if it fits.
2. **Create the directory.** Copy `plugins/starter/` to `plugins/<name>/`. The name is kebab-case, must not start with `claude-`, `anthropic-` or `cc-plugin-`, and is permanent.
3. **Fill in the manifest.** In `plugins/<name>/.claude-plugin/plugin.json` set `name` to `<name>`, `version` to `0.1.0`, and a one-sentence `description`.
4. **Write the components.** Replace the starter skill and agent. Use `plugins/starter/` as the reference. No secrets or absolute paths; quote `"${CLAUDE_PLUGIN_ROOT}"` in hooks; keep state in `${CLAUDE_PLUGIN_DATA}`. Hooks, MCP servers and scripts get extra review.
5. **Write the docs.** Update the plugin's `README.md`, `CHANGELOG.md` (`## 0.1.0`) and `COMPATIBILITY.md`.
6. **Register it.** Add an entry to `.claude-plugin/marketplace.json` with the same `name` and `"source": "./plugins/<name>"`, and a row to the plugin table in `README.md`.
7. **Assign owners.** Add `/plugins/<name>/ @<owner>` to `.github/CODEOWNERS`.
8. **Check locally** (see below), then open a PR and fill in the template.

## Change a plugin

1. Make the change inside `plugins/<name>/`.
2. Bump `version` in its `plugin.json` (patch for fixes, minor for new components, major for breaking changes).
3. Add a `## <version>` section to its `CHANGELOG.md`.
4. Check locally, open a PR.

Never rename a plugin: users reference it by name. To remove one, delete its entry and directory and add `"renames": { "<name>": null }` to `marketplace.json`.

## Local checks

```bash
claude plugin validate . --strict
node scripts/lint-marketplace.mjs --base origin/main
```

Then install from your checkout and try the plugin in a session:

```
/plugin marketplace add ./
/plugin install <name>@dev-digest-ai-marketplace
/reload-plugins
```

## Review and merge

- The code owners of every touched path review the PR (`.github/CODEOWNERS`).
- CI (`Validate marketplace`) must be green.
- Changes to hooks, MCP servers, scripts or dependencies get a line-by-line review.
- Merging to `main` releases the change. Optionally tag it `<name>--v<version>`.
