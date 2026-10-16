# starter

Reference template for plugins in this marketplace. It ships the minimum every plugin here needs.

## Contents

| Type | Name | Purpose |
|---|---|---|
| Skill | `hello` | Confirms the plugin is installed |
| Agent | `starter-helper` | Confirms plugin agents load |

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install starter@dev-digest-ai-marketplace
```

## Use as a template

1. Copy `plugins/starter/` to `plugins/<new-name>/` (kebab-case).
2. Set `name` in `.claude-plugin/plugin.json` to `<new-name>` and reset `version` to `0.1.0`.
3. Replace the skill and agent, update this README, `CHANGELOG.md` and `COMPATIBILITY.md`.
4. Add an entry to `.claude-plugin/marketplace.json` with the same `name` and `"source": "./plugins/<new-name>"`.
5. Add the plugin path to `.github/CODEOWNERS`.
6. Run the checks from the root README.
