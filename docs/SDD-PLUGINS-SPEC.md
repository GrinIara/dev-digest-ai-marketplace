# Spec: SDD plugins

Status: **Decisions recorded** (see [Decisions](#decisions)); ready for the plan. Checked against the source repository and the Claude Code plugin docs. Nothing is ported yet.

Source: [`GrinIara/dev-digest`](https://github.com/GrinIara/dev-digest) at commit `7381eb1` (`main`), directory `.claude/`.

## Objective

Publish four plugins in this marketplace so a team can run Spec Driven Development (SDD) in Claude Code: write a spec, plan, implement, verify, then review the run.

Three plugins are small and reusable on their own. The fourth, `sdd-engineering`, is the workflow and depends on the other three.

Success means: `/plugin install sdd-engineering@dev-digest-ai-marketplace` installs all four, and the workflow runs on a project that has nothing to do with DevDigest.

## Plugin map

| Plugin | Role | Ships | Depends on |
|---|---|---|---|
| `engineering-paved-path` | Reusable skills | 11 skills: React, Next.js, Fastify, architecture (backend and frontend), testing, security, TypeScript, Zod, Drizzle, PostgreSQL | none |
| `research-tools` | Reusable agent | read-only agent `researcher` | none |
| `architecture-review` | Reusable agent | generalized agent `architecture-reviewer` | `engineering-paved-path` `^1.0.0` |
| `sdd-engineering` | The workflow | agents `spec-creator`, `implementation-planner`, `implementer`, `plan-verifier`; skills `implement`, `workflow-retro` | the three plugins above, each `^1.0.0` |

Dependency direction is one way and has no cycles: `sdd-engineering` → the three, and `architecture-review` → `engineering-paved-path`. `engineering-paved-path` and `research-tools` depend on nothing. `sdd-engineering` declares `engineering-paved-path` directly as well, because its planner and implementer load those skills themselves.

Why three small plugins instead of one bundle: they are useful alone, and every installed skill description costs context on every turn (`docs/PLUGIN-GUIDELINES.md`, Size).

## Where each piece comes from

| Plugin component | Source file in `dev-digest` | Size | DevDigest-specific lines |
|---|---|---|---|
| `spec-creator` | `.claude/agents/spec-creator.md` | 215 | 23 |
| `implementation-planner` | `.claude/agents/implementation-planner.md` | 222 | 35 |
| `implementer` | `.claude/agents/implementer.md` | 98 | 18 |
| `plan-verifier` | `.claude/agents/plan-verifier.md` | 103 | 9 |
| `researcher` | `.claude/agents/researcher.md` | 56 | 0 (portable as is) |
| `architecture-reviewer` | `.claude/agents/architecture-reviewer.md` | 131 | 18 |
| skill `implement` (already named `implement` in the source) | `.claude/skills/implement/SKILL.md` | 133 | 6 |
| skill `workflow-retro` + `scripts/collect.sh` | `.claude/skills/workflow-retro/` | 94 + 93 | 8 (the script: 0) |
| README of how it fits together | `.claude/agents/README.md` (295 lines: pipeline, gates, permissions, trace recipe) | | 24 |

"DevDigest-specific lines" counts lines mentioning `devdigest`, `client/`, `server/`, `reviewer-core`, `docs/plans`, `CLAUDE.md`, `Insights`, `pnpm` or `.claude/`.

Not ported (not on the list): `brainstorm`, `test-writer`, `doc-writer`, `mechanical-checker`, `security-reviewer`, the hooks under `.claude/hooks/`, `.claude/settings.json` (it allows `mcp__devdigest__run_agent_on_pr`), `docs/plans/*`, `specs/*`, `CLAUDE.md`, every `AGENTS.md`.

## What does not survive inside a plugin

This is the main porting risk. Per the Claude Code docs, **plugin subagents ignore the frontmatter fields `hooks`, `mcpServers` and `permissionMode`**, "for security reasons". The source agents depend on exactly these:

| Source agent | Relies on | Effect after porting |
|---|---|---|
| `spec-creator` | `PreToolUse` guard hook (can only create a new draft `SPEC-*.md`, only `Agent` → `researcher`/`Explore`), read-only Bash guard, `permissionMode: acceptEdits`, four `mcp__devdigest__*` tools | Guards gone; `permissionMode` ignored; MCP tools must be dropped |
| `implementation-planner` | guard hook (only writes a new `docs/plans/*.md`, blocks specs, read-only Bash, `Agent` only → `researcher`/`Explore`) | Guard gone |
| `implementer` | guard hook (blocks commit/push, destructive git, migrations, edits to lockfiles, `.env*`, `CLAUDE.md`, `.claude/`), `permissionMode: acceptEdits` | Guard gone |
| `plan-verifier`, `architecture-reviewer` | read-only Bash guard (`readonly-guard.sh`) | They keep `Bash` in the tool list with no allowlist, so they could write through Bash |

What still works: `tools`, `disallowedTools`, `model`, the prompt text. The prompts already state the same limits, so the first line of defence stays; the hard enforcement does not.

Options considered (decided: option 1, see [Decisions](#decisions)):

1. **Ship without guard hooks (chosen for v1).** Keep `tools` / `disallowedTools` tight, state the limits in each prompt, and document the reduced enforcement in `sdd-engineering/README.md` and `COMPATIBILITY.md`. No hooks means no extra install-time risk.
2. **Plugin-level hook** in `hooks/hooks.json` that re-implements the guards. It would apply to the whole session, not only to these agents, and every hook script gets a line-by-line review (`docs/SECURITY.md`). Only worth it if agent scoping can be done reliably; not verified.
3. **Drop `Bash`** from the reviewers. Safest, but `plan-verifier` can then no longer run typecheck, tests and lint, which is its job.

Whichever is chosen, `permissionMode: acceptEdits` is simply removed and the user's own permission mode applies.

## Orchestration (checked)

- The Claude Code docs say a subagent can spawn subagents "up to three layers below the main conversation" (set `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1` to forbid). So `spec-creator` and `implementation-planner` may call `researcher`, as in the source. The earlier draft of this spec said the opposite; that was wrong.
- The other agents are called by the main session through the `implement` skill. `implementer`, `plan-verifier` and `architecture-reviewer` have `Agent` in `disallowedTools`.
- Cross-plugin names are always namespaced: `research-tools:researcher`, `architecture-review:architecture-reviewer`, `sdd-engineering:implementer`. In the source the prompts use bare names.
- `implement` is user-invoked only (`disable-model-invocation: true`, already so in the source) and refuses to run on `main` or on a plan with an open blocking question.
- `implement` calls agents that are not in our four plugins: `mechanical-checker` (runs the plan's Package gates), `security-reviewer` (only when the diff touches a security-relevant surface), `test-writer` (already skipped), `doc-writer` (offered at the end). Proposed change for v1: the main session runs the Package gates itself (the source README allows this), the security-review step is skipped with a log line, the `doc-writer` offer is removed.

```
 request
   │
   ▼
 spec-creator ──(may spawn)──► research-tools:researcher
   │  writes a draft spec; the user approves it
   ▼
 implementation-planner ──(may spawn)──► research-tools:researcher
   │  review call (questions) → planning call → plan; the user approves it
   ▼
 /sdd-engineering:implement <plan>   (main session orchestrates)
   │  implementer → plan-verifier (completeness) → architecture-review:architecture-reviewer
   │  → fix loop (≤3 iterations per reviewer) → Package gates → plan-verifier (final)
   ▼
 /sdd-engineering:workflow-retro   retrospective of the run (manual)
```

## Layout

```
plugins/
├── engineering-paved-path/
│   ├── .claude-plugin/plugin.json
│   ├── skills/
│   │   ├── react-best-practices/
│   │   ├── next-best-practices/
│   │   ├── fastify-best-practices/
│   │   ├── backend-onion-architecture/
│   │   ├── frontend-ui-architecture/
│   │   ├── react-testing-library/
│   │   └── security/
│   └── README.md  CHANGELOG.md  COMPATIBILITY.md
├── research-tools/
│   ├── .claude-plugin/plugin.json
│   ├── agents/researcher.md
│   └── README.md  CHANGELOG.md  COMPATIBILITY.md
├── architecture-review/
│   ├── .claude-plugin/plugin.json
│   ├── agents/architecture-reviewer.md
│   └── README.md  CHANGELOG.md  COMPATIBILITY.md
└── sdd-engineering/
    ├── .claude-plugin/plugin.json                (dependencies below)
    ├── agents/  spec-creator.md  implementation-planner.md  implementer.md  plan-verifier.md
    ├── skills/
    │   ├── implement/SKILL.md
    │   └── workflow-retro/{SKILL.md, scripts/collect.sh}
    ├── README.md                                 how the pieces work together (from agents/README.md)
    ├── CHANGELOG.md                              versions and releases
    └── COMPATIBILITY.md                          Claude Code version, dependencies, `jq`
```

Names in `skills/` are the real names from the source. In a plugin the source `.claude/agents/` and `.claude/skills/` move to `agents/` and `skills/` at the plugin root; a `.claude/` folder inside a plugin is not scanned.

The "versions and releases" file is `CHANGELOG.md`, one `## <version>` section per release, as the repo lint requires.

### Which skills go where

The slide lists React, Next.js, Fastify, architecture, testing and security for `engineering-paved-path`. They map to these source skills:

| Group | Source skill |
|---|---|
| React | `react-best-practices` |
| Next.js | `next-best-practices` |
| Fastify | `fastify-best-practices` |
| Architecture | `backend-onion-architecture`, `frontend-ui-architecture` |
| Testing | `react-testing-library` |
| Security | `security` |

The source also has skills the SDD agents use, or that are not on the slides. Decided handling:

| Source skill | Used by | Proposal |
|---|---|---|
| `ears-requirements`, `mermaid-diagram` | `spec-creator` (preloaded), `implementation-planner` (diagrams) | Put in `sdd-engineering` (spec tooling, not framework knowledge) |
| `engineering-insights` | `implementation-planner`, `implementer` (preloaded) | Not ported in v1: it manages per-module `Insights.md`, a DevDigest convention |
| `ux-review`, `pr-self-review` | `spec-creator` on demand; the user | Out of scope for v1 |
| `zod`, `typescript-expert`, `drizzle-orm-patterns`, `postgresql-table-design` | stack skills | Included in `engineering-paved-path` (decision 11) |

Preloading skills from another plugin through the `skills:` frontmatter field is **not confirmed** by the docs (they only say listed skills are injected, and unlisted plugin skills stay reachable through the `Skill` tool). Safer: the agents load them by namespaced name through the `Skill` tool, which the source already does for on-demand skills ("MANDATORY" skill gates).

## Porting rules

Carry over: the four agents, `implement`, `workflow-retro` and the README content. Evals are not carried over in v1.

Do not carry over: product specs, secrets, caches, DevDigest-specific instructions.

For each file:

1. Replace DevDigest paths and layout (`client/`, `server/`, `reviewer-core/`, `docs/plans/`, `specs/`, `CLAUDE.md`, `AGENTS.md`, `Insights.md`, `pnpm`) with explicit inputs: plan path, spec path, package gate commands, where to write.
2. Remove the four `mcp__devdigest__*` tools and every mention of DevDigest.
3. Remove `hooks`, `permissionMode` and `mcpServers` from frontmatter (ignored in plugins anyway) and update the prompts that say a hook enforces something.
4. Namespace every reference to another plugin's agent or skill.
5. Scripts: `collect.sh` needs `bash` and `jq`; list both in `COMPATIBILITY.md`. It reads session transcripts under `~/.claude/projects/`, read-only. Call it from the skill body as `bash "${CLAUDE_PLUGIN_ROOT}/skills/workflow-retro/scripts/collect.sh"`: the plugin docs substitute `${CLAUDE_PLUGIN_ROOT}` in skill content, but the variable is not present in the Bash tool's environment. `${CLAUDE_SKILL_DIR}` (from the slide) is not in the plugin docs; use `${CLAUDE_PLUGIN_ROOT}`.
6. `workflow-retro` writes `docs/retro/ledger.md` and a per-module insights section. Keep the ledger path as a default input; remove the `server/` / `client/` module section.
7. Record the source commit and the origin of each file in the plugin README. Reusing `dev-digest` content is allowed; keep the original author's attribution where one exists (for example the `mcollina/fastify-best-practices` tile).

### Tools and models (from the source)

| Agent | Model | Tools | Denied |
|---|---|---|---|
| `spec-creator` | opus | Read, Grep, Glob, Bash, Write, Edit, WebFetch, Skill, Agent | NotebookEdit, WebSearch |
| `implementation-planner` | opus | Read, Grep, Glob, Bash, Write, Agent, Skill | Edit, NotebookEdit, WebFetch, WebSearch |
| `implementer` | sonnet | Read, Grep, Glob, Edit, Write, Bash, Skill | Agent, NotebookEdit, WebFetch, WebSearch |
| `plan-verifier` | sonnet | Read, Grep, Glob, Bash | Write, Edit, NotebookEdit, Agent, Skill, WebFetch, WebSearch |
| `architecture-reviewer` | sonnet | Read, Grep, Glob, Bash | Write, Edit, NotebookEdit, Agent, Skill, WebFetch, WebSearch |
| `researcher` | sonnet | Read, Grep, Glob, Bash, WebFetch, WebSearch | none declared |

`researcher` is called "read-only", but it keeps `Bash` and has no guard in the source. Decided: keep `Bash` (repo history lookups need `git log` and `git blame`) and word the README honestly: the agent has no edit tools; `Bash` is not restricted.

### `architecture-reviewer` must be generalized

In the source its fixed check catalog (AB/RC/FC/XP) is tied to the DevDigest layering and preloads `backend-onion-architecture` and `frontend-ui-architecture`. The generalized version takes the path to the project's architecture rules as input. If `engineering-paved-path` is installed, it may also load that plugin's architecture skills by namespaced name. `architecture-review` itself declares no dependency.

## Manifest for `sdd-engineering`

```json
{
  "name": "sdd-engineering",
  "version": "1.0.0",
  "description": "Spec Driven Development workflow: spec, plan, implement, verify, retro.",
  "author": { "name": "GrinIara", "url": "https://github.com/GrinIara" },
  "repository": "https://github.com/GrinIara/dev-digest-ai-marketplace",
  "keywords": ["sdd", "spec", "planning", "workflow"],
  "dependencies": [
    { "name": "engineering-paved-path", "version": "^1.0.0" },
    { "name": "research-tools", "version": "^1.0.0" },
    { "name": "architecture-review", "version": "^1.0.0" }
  ]
}
```

Version ranges resolve against git tags named `<name>--v<version>`, so the three dependencies must be tagged `--v1.0.0` before `sdd-engineering` can install. The CLI has a `claude plugin tag` command for creating these tags.

## Marketplace and repo changes

- Four entries in `.claude-plugin/marketplace.json` (`source: ./plugins/<name>`, no `version`), categories such as `engineering`, `research`, `architecture`, `workflow`.
- Four rows in the root `README.md` plugin table.
- Four lines in `.github/CODEOWNERS`.
- Each plugin has `README.md`, `CHANGELOG.md` with `## 1.0.0`, and `COMPATIBILITY.md` that lists its dependencies.
- `sdd-engineering` contains a script (`collect.sh`), so the PR template's Security section must list it, and it gets a line-by-line review.

## Commands

```
Validate:    claude plugin validate . --strict
Lint:        node scripts/lint-marketplace.mjs --base origin/main
Local test:  /plugin marketplace add ./
             /plugin install sdd-engineering@dev-digest-ai-marketplace
             /reload-plugins
Tag:         claude plugin tag            (creates <name>--v<version>)
```

CI already runs validate, lint and an install smoke test of every listed plugin.

## Release order

1. Merge `engineering-paved-path` and `research-tools` at `1.0.0` and tag them. Then merge `architecture-review` (it depends on `engineering-paved-path`) and tag it. Tags: `engineering-paved-path--v1.0.0`, `research-tools--v1.0.0`, `architecture-review--v1.0.0`. All three can be released in one PR; the order only matters for the tags.
2. Merge `sdd-engineering` at `1.0.0` and tag `sdd-engineering--v1.0.0`.
3. Rollback follows `docs/RELEASES.md`: release a new version forward, never reuse a version. Because `sdd-engineering` requires `^1.0.0`, a breaking change in a dependency means `2.0.0` and a new `sdd-engineering` range.

## Testing

- CI: `validate --strict`, lint, install smoke test (installing `sdd-engineering` must also pull the three dependencies).
- Static check after porting: no `devdigest`, `mcp__devdigest`, `client/`, `server/`, `reviewer-core`, `.claude/` or absolute paths in plugin files; no bare cross-plugin names.
- Evals: none in v1. The `evals/` harness from the `dev-digest` feature branch is not shipped inside a plugin; a later PR may add a trimmed copy at the repo root (see Decisions, item 7).
- Manual: one end-to-end run (spec → plan → implement → verify → retro) on a small sample repo that is not DevDigest.

## Boundaries

- **Always:** namespaced cross-plugin references; explicit inputs; least-privilege `tools`/`disallowedTools`; `CHANGELOG` entry and version bump with every change; the rules in `docs/SECURITY.md`; record the origin of each ported file.
- **Ask first:** adding hooks, MCP servers or scripts; adding a dependency to a reusable plugin; changing a dependency range; starting a plugin below `1.0.0`.
- **Never:** copy product specs, secrets, caches or DevDigest instructions; write state into `${CLAUDE_PLUGIN_ROOT}`; rename a published plugin; drop the original author's attribution from a ported skill.

## Success criteria

- `claude plugin validate . --strict` and the lint pass; the CI install smoke test passes for all four.
- Installing `sdd-engineering` installs the three dependencies at a `^1.0.0` version.
- The static check above finds nothing in the four plugin directories (the marketplace name `dev-digest-ai-marketplace` in install commands is the only allowed match).
- `plan-verifier`, `architecture-reviewer` and `researcher` have no `Write`/`Edit`; the README states honestly what is and is not enforced without hooks.
- A full run on a sample repo produces a spec, a plan, an implementation and a verification report, and `workflow-retro` reads that run.
- Each plugin README explains what it does; the `sdd-engineering` README explains the whole workflow and the dependency relationship.

## Decisions

Recorded 2026-10-16.

| # | Question | Decision |
|---|---|---|
| 1 | Enforcement without hooks | **Option 1:** no guard hooks. Tight `tools` / `disallowedTools`, limits stated in prompts, reduced enforcement documented in `sdd-engineering/README.md` and `COMPATIBILITY.md`. |
| 2 | Origin of ported skills | **`dev-digest` content may be reused**, including `fastify-best-practices`, `react-best-practices`, `next-best-practices`, `react-testing-library` and `security`. Keep the original author's attribution where one exists. |
| 3 | Agents missing from the set | The main session runs the Package gates itself; the security-review step is skipped with a log line; the `doc-writer` offer is removed. `security-reviewer` may be added in 1.1. |
| 4 | `researcher` and `Bash` | Keep `Bash`. README says: no edit tools, `Bash` not restricted. |
| 5 | Rules source for `architecture-reviewer` | A path to the project's rules is the main input, and the matching `engineering-paved-path` skills are loaded by namespaced name. **Changed on 2026-10-16: `architecture-review` now declares `engineering-paved-path` `^1.0.0` as a hard dependency.** |
| 6 | Placement of `ears-requirements`, `mermaid-diagram`, `engineering-insights` | The first two go to `sdd-engineering`. `engineering-insights` is not ported in v1. |
| 7 | Evals | None inside plugins in v1. A later PR adds a trimmed copy at the repo root: only `architecture-reviewer` cases, without LiteLLM, OpenRouter, `dependency-checker` and the review workflow, paths pointing at `plugins/*/agents`, all DevDigest names removed. |
| 8 | Start version | **`1.0.0` for all four plugins.** `docs/PLUGIN-GUIDELINES.md` gets a note that plugins ported from a stable project may start at `1.0.0`. |
| 9 | Default paths | Keep the source convention: `specs/`, `docs/plans/`, `docs/retro/ledger.md`. Every path can be overridden by an argument; no DevDigest paths in prompts. |
| 10 | Owners | `@GrinIara` for all four plugins, one `CODEOWNERS` line each. Move to a team once one exists. |
| 11 | Scope of `engineering-paved-path` | Also includes `typescript-expert`, `zod`, `drizzle-orm-patterns` and `postgresql-table-design` (11 skills in total). The unreferenced `typescript-expert/scripts/ts_diagnostic.py` is not shipped, so the plugin has no scripts. |
| 12 | Project independence | No skill or agent may mention the source project, its repository, its package names or its folder layout, and none may hard-code project paths or commands. Defaults (`specs/`, `docs/plans/`, `docs/retro/ledger.md`) are overridable by the caller. Provenance is recorded only in each plugin's `CHANGELOG.md`. Checked by a grep over the four plugins. |
| 13 | READMEs | Every plugin has its own README: what it is, install, contents, how to use it with example prompts, how it works with the other plugins, what is and is not enforced. |

The skill is named **`implement`**, confirmed by the owner (`run-plan` on the slide is the older name). Invoked as `/sdd-engineering:implement <plan>`.

## Follow-up tasks

- Add the `1.0.0` note to `docs/PLUGIN-GUIDELINES.md` (decision 8).
- Ruleset on `main` and the gaps in `docs/SECURITY.md` and `docs/RELEASES.md` (incident response, release channels) are separate from this spec.
