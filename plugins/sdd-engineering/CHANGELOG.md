# Changelog

## 1.0.0 - 2026-10-16

- First release.
- Agents: `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`.
- Skills: `implement`, `workflow-retro` (with its read-only `collect.sh` helper), `ears-requirements`, `mermaid-diagram`.
- Depends on `engineering-paved-path`, `research-tools` and `architecture-review`, each `^1.0.0`.
- Ported from the maintainer's own project setup (`GrinIara/dev-digest`, commit `7381eb1`) and generalised: project paths, package names, project-specific MCP tools and hook-based guards were removed. The agents' limits are now stated as rules in their prompts and enforced only through their tool lists, because plugin agents do not support `hooks`, `permissionMode` or `mcpServers` frontmatter.
- `implement` runs the package gates itself and has no test-writing or security-review step; see the README for how to add them.
