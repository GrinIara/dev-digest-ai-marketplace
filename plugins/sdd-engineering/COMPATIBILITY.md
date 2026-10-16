# Compatibility

| Requirement | Value |
|---|---|
| Claude Code | 2.1.301 or later (version used in CI) |
| OS | macOS, Linux, Windows (Git Bash or WSL for `workflow-retro deep`) |
| External dependencies | `git`; `bash` and `jq` only for `workflow-retro deep` |
| Plugin dependencies | `engineering-paved-path` `^1.0.0`, `research-tools` `^1.0.0`, `architecture-review` `^1.0.0` (installed automatically) |
| MCP servers | None |
| Hooks | None |
| Scripts | `skills/workflow-retro/scripts/collect.sh`: read-only, reads session transcripts under the Claude config directory and prints metrics |
