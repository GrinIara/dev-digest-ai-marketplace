# Releases

## Versioning

- Each plugin has its own SemVer `version` in `plugin.json`. Do not set `version` in the marketplace entry.
- Claude Code decides whether to update by comparing versions. If files change and the version does not, users never receive the change.
- CI fails a PR that changes a plugin without bumping its version.

| Change | Bump |
|---|---|
| Fix in a skill, agent or script; wording | patch `0.1.0 → 0.1.1` |
| New skill, agent, hook or option | minor `0.1.0 → 0.2.0` |
| Removed or renamed component, changed behavior users rely on, new required config | major `1.x → 2.0.0` |

Stay on `0.x` until a plugin's interface is stable.

## Releasing a change

1. Make the change in `plugins/<name>/`.
2. Bump `version` in `plugins/<name>/.claude-plugin/plugin.json`.
3. Add a `## <version>` section to `plugins/<name>/CHANGELOG.md`.
4. Open a PR. Merging to `main` publishes it.
5. Optional: tag the merge commit `<name>--v<version>` (for example `starter--v0.2.0`). Dependency version ranges resolve against tags in this format.

## How users get updates

Auto-update is off by default for third-party marketplaces. Users either:

- turn it on in `/plugin` → Marketplaces, or
- run `/plugin marketplace update dev-digest-ai-marketplace`.

Updates take effect after `/reload-plugins` or a restart.

## Rollback

There is no "unpublish". To roll back, release a new version:

1. Revert the change in a PR.
2. Bump the version forward (for example `0.3.0` broken → `0.3.1` with the old code). Do not reuse or lower a version: it makes the changelog, tags and dependency ranges ambiguous.
3. Note the rollback in `CHANGELOG.md`.

To hold users on a specific commit, they can add the marketplace pinned to a ref: `/plugin marketplace add GrinIara/dev-digest-ai-marketplace#<tag-or-branch>`.

## Removing a plugin

1. Remove its entry from `marketplace.json` and its directory.
2. Add `"renames": { "<name>": null }` so clients know it is gone.
3. Installed copies stay on users' machines unless `forceRemoveDeletedPlugins` is `true` in `marketplace.json`.
