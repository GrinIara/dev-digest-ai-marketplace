# architecture-review

An architecture reviewer agent for Claude Code. It checks a change against the project's layering and boundary rules and returns findings with evidence: the exact line, the rule that is violated and where that rule comes from, a severity, a suggested fix and a confidence level. It also lists the checks that ran clean.

It does not edit files and it does not review security, style or correctness bugs.

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install architecture-review@dev-digest-ai-marketplace
/reload-plugins
```

This also installs `engineering-paved-path`, because the reviewer uses its skills as rule sources.

## What is inside

| Component | Type | Purpose |
|---|---|---|
| `architecture-reviewer` | agent | Reviews a diff against a fixed catalog of architecture checks |

Tools: `Read`, `Grep`, `Glob`, `Bash`, `Skill`. Model: Sonnet.

## How to use it

Run it after an implementation and before opening a pull request, or any time you ask whether a change respects the architecture:

```
Use the architecture-reviewer agent to review my changes against the main branch.
```

```
Use the architecture-reviewer agent on src/modules/orders. The architecture rules are in docs/architecture.md.
```

By default it reviews the working-tree diff against the merge base with the default branch, including untracked files, plus the direct importers of changed files. You can instead give it paths, a diff range or a plan file.

### Where its rules come from

The project's rules always win. It collects them in this order and cites the source of every rule it applies:

1. Rules you name in the prompt (a file or text).
2. Project instruction and architecture documents: `CLAUDE.md`, `AGENTS.md`, `README.md` of the touched packages, and documents under `docs/` that mention architecture, layering or boundaries, including lists of accepted tradeoffs.
3. Skills from `engineering-paved-path`, loaded by namespaced name according to the files in the diff:

| Files in the diff | Skills it loads |
|---|---|
| Backend: routes, services, repositories, adapters | `backend-onion-architecture`, `fastify-best-practices` |
| Database schema, queries, migrations | `drizzle-orm-patterns`, `postgresql-table-design` |
| Frontend: pages, components, hooks | `frontend-ui-architecture`, `react-best-practices`, `next-best-practices` |
| Shared schemas and contracts | `zod` |
| Any TypeScript | `typescript-expert` |

If the project has no architecture rules of its own, the loaded skills are the rule source. The agent never invents a rule.

### The checks

| Group | IDs | Examples |
|---|---|---|
| Backend layering | B1–B9 | a route importing the ORM, a service importing the web framework, a concrete adapter used instead of its port, business rules in a route handler |
| Pure core | C1–C3 | a library package importing file, network or database access; a public export removed |
| Frontend structure | F1–F8 | network calls outside the data-access module, a page holding feature logic, `"use client"` too high in the tree |
| Cross-package | X1–X3 | relative imports across package roots, mirrored contract copies that differ, an applied migration edited |

Checks run only when their precondition exists in the project. A dependency-direction violation is `critical`. Severities are `critical`, `major`, `minor` and `nit`.

### The report

1. Scope: base sha, files, rule sources and skills used
2. Verdict: `pass`, `pass-with-findings` or `blocking`
3. Findings with evidence, rule source, fix and confidence, plus a short "needs human judgement" list
4. Checks that ran clean
5. Known tradeoffs it did not re-flag
6. Out of scope (security, correctness, style)
7. Fitness-function candidates: checks you could turn into `dependency-cruiser` or `eslint-plugin-boundaries` rules
8. A one-line-per-finding handoff summary that a caller can pass straight to whoever fixes the code

### Delta re-review

When a prompt starts with `Delta re-review` and lists the previous findings, accepted findings and the files a fix changed, the agent re-checks only those files, marks each previous finding `resolved` or `still open`, and reports new violations as `introduced by fix`. `sdd-engineering`'s `implement` skill uses this in its fix loop.

## Works with the other plugins

| Plugin | Relationship |
|---|---|
| `engineering-paved-path` | Dependency. Supplies the architecture, framework and data skills the reviewer loads. |
| `sdd-engineering` | Uses this reviewer in the review phase of `implement`. |

## What is and is not enforced

- The agent has no `Write` or `Edit` tool, enforced by its tool list.
- It uses only read-only `Bash` commands by instruction. This plugin installs no hooks, so that rule is not technically enforced. Review its commands if you run it with broad permissions.
- If `engineering-paved-path` is somehow missing, it says so in the report and reviews against the project's own rules only.

## Versions

See [CHANGELOG.md](CHANGELOG.md).
