## What changes

<!-- Which plugin(s), and what changes for users. -->

## Type

- [ ] New plugin
- [ ] Change to an existing plugin
- [ ] Marketplace / CI / docs only

## Checklist

CI already checks names, versions, paths, CHANGELOG sections, CODEOWNERS and secret patterns. Confirm what it can't:

- [ ] Tested locally: `/plugin marketplace add ./` and `/plugin install <name>@dev-digest-ai-marketplace`
- [ ] Skill descriptions say what the skill does and when to use it
- [ ] Version bump matches the change (patch / minor / major)
- [ ] No plugin `name` renamed (or `renames` added in `marketplace.json`)
- [ ] `README.md` and `COMPATIBILITY.md` are up to date
- [ ] Root `README.md` plugin table is updated (new or removed plugin)

## Security

<!-- Fill in if the PR touches hooks, MCP servers, scripts or dependencies. -->

- [ ] No hooks, MCP servers, scripts or dependencies added or changed
- [ ] Or: changes listed below, with network hosts and permissions they need
