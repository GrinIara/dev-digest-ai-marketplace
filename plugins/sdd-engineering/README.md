# sdd-engineering

A Spec Driven Development (SDD) workflow for Claude Code. It splits a feature into separate, reviewable steps, each done by a dedicated agent in a fresh context: write a spec, plan the work, implement the plan, verify the result against the plan, and review how the run went.

You approve at two points, the spec and the plan. Nothing is committed for you.

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install sdd-engineering@dev-digest-ai-marketplace
/reload-plugins
```

Installing it also installs three plugins it depends on:

| Dependency | Why |
|---|---|
| `engineering-paved-path` | Skills the planner and implementer load per task (React, Next.js, Fastify, Drizzle, PostgreSQL, Zod, TypeScript, architecture, testing, security) |
| `research-tools` | The `researcher` agent that the spec-creator and planner call for research |
| `architecture-review` | The `architecture-reviewer` agent used in the review phase of `implement` |

## What is inside

| Component | Type | Model | What it does |
|---|---|---|---|
| `spec-creator` | agent | Opus | Turns an idea and your design sources into a draft spec with EARS acceptance criteria; asks blocking questions first |
| `implementation-planner` | agent | Opus | Reviews requirements, asks questions, then writes an implementation plan with tasks, owned paths, skills and checks |
| `implementer` | agent | Sonnet | Executes the plan, task by task, inside each task's owned paths, until the checks are green |
| `plan-verifier` | agent | Sonnet | Checks the finished code against the plan, item by item, and reports Met / Partial / Missing / Unverifiable with evidence |
| `implement` | skill | | `/sdd-engineering:implement <plan>`: runs an approved plan from implementation to final verification |
| `workflow-retro` | skill | | `/sdd-engineering:workflow-retro`: retrospective of a finished multi-agent run |
| `ears-requirements` | skill | | How to write testable acceptance criteria with EARS; used by `spec-creator` |
| `mermaid-diagram` | skill | | Mermaid diagrams in specs and plans |

## The workflow

```
 idea
   │
   ▼
 spec-creator ──(may call)──► research-tools:researcher
   │  asks blocking questions, then writes a draft spec
   ▼
 you review the spec and set Status: approved
   │
   ▼
 implementation-planner ──(may call)──► research-tools:researcher
   │  review call: questions + execution mode → planning call: writes the plan
   ▼
 you review the plan
   │
   ▼
 /sdd-engineering:implement <plan>          (your main session orchestrates)
   │   1 implementer       (one, or one per task of each wave)
   │   2 plan-verifier     (completeness; skipped for small plans)
   │   3 architecture-review:architecture-reviewer
   │   4 fix loop          (triage → fix → delta re-review, up to 3 iterations per reviewer)
   │   5 package gates     (full test suites)
   │   6 plan-verifier     (final, against the plan and the spec)
   ▼
 you run the Unverifiable checks, set Status: implemented, commit
   │
   ▼
 /sdd-engineering:workflow-retro            (optional)
```

### Step by step

**1. Write a spec** (optional, for features that need one)

```
Use the spec-creator agent. Feature: let customers retry a failed order. Design notes are in docs/notes/retry.md.
```

The agent first returns a Discovery Report with up to four blocking questions (each with a recommended answer). Answer them, and it writes `SPEC-<date>-<slug>.md` with `Status: draft`. Read it, change what you want, and set `Status: approved` yourself. The agent never approves a spec.

**2. Plan**

```
Use the implementation-planner agent to plan specs/SPEC-2026-10-16-order-retry.md.
```

The planner works in two calls. The first returns a Requirements Review: gaps, conflicts, recommendations, questions, and always the execution-mode question (single-agent or multi-agent). After your answers, the second call writes the plan to a new file in `docs/plans/` (or the folder you name). It never edits a spec or product code.

**3. Implement**

```
/sdd-engineering:implement docs/plans/2026-10-16-order-retry.md
```

You can add instructions after the path. To resume an interrupted run, pass the `*.trace.md` run log that the skill writes next to the plan.

**4. Review the run** (optional)

```
/sdd-engineering:workflow-retro
```

Add `deep` to also parse session transcripts with the bundled script.

## Conventions

These are defaults. Every path can be overridden by naming another one in your prompt.

| Artifact | Default location | Written by |
|---|---|---|
| Spec | `specs/SPEC-<YYYY-MM-DD>-<slug>.md` (`<module>/specs/` if your project keeps specs per module) | `spec-creator` |
| Plan | `docs/plans/<YYYY-MM-DD>-<slug>.md` | `implementation-planner` |
| Run log | `<plan name>.trace.md` next to the plan | `implement` |
| Retro ledger | `docs/retro/ledger.md` | `workflow-retro` |

A spec has: problem and user, goals and non-goals, user stories with priorities, acceptance criteria in EARS form (each ending with how it is verified), edge cases, workflows and contracts, non-functional requirements, inputs and provenance, untrusted inputs, open questions and an optional design analysis.

A plan has: goal and scope, numbered requirements that cite their source, a requirements review, constraints, tasks (with owned paths, mandatory skills, change, why, risk, acceptance and a fast done-condition), optional waves for multi-agent mode, package gates (full test suites), testing strategy, diagrams, traceability, a red-flags check, and risks.

The commands for typecheck, lint and tests are always read from your project's manifests and instruction files, never guessed.

## Execution modes

| Mode | When it pays off | How it runs |
|---|---|---|
| single-agent | Most changes | One implementer runs every task in order |
| multi-agent | At least two independent tasks in different packages | Tasks are grouped into waves; one implementer per task runs in parallel inside a wave; the package gates run after each wave |

You choose the mode when the planner asks. Both work in the current branch, with no worktrees.

## What is and is not enforced

Plugin agents cannot ship `hooks`, `permissionMode` or `mcpServers` in their frontmatter, and this plugin installs no hooks. So:

- **Enforced by tool lists:** `plan-verifier` has no `Write` or `Edit`; `implementer` has no `Agent`; `implementation-planner` has no `Edit`; no agent has `NotebookEdit`.
- **Stated as rules in each agent's prompt, not technically enforced:** the planner writes only a new plan file; `spec-creator` writes only a draft spec; the reviewer and verifier use only read-only shell commands; the implementer never commits, pushes, migrates a shared database or edits lockfiles and environment files.

If you need hard enforcement, add your own hooks in your project settings. Run the agents with a permission mode you are comfortable with, and review the commands they ask to run.

## Cost and trace

Each agent call can be costed from its transcript. Transcripts live under the Claude config directory (`$CLAUDE_CONFIG_DIR`, default `~/.claude`) in `projects/<working directory with / replaced by ->/<session id>/subagents/agent-<id>.jsonl`. This layout can change between Claude Code versions. A message spans several lines that repeat the usage, so de-duplicate by `message.id` before summing:

```bash
jq -s 'map(select(.type=="assistant" and .message.usage)) | group_by(.message.id) | map(last) | {models: (map(.message.model)|unique), in: (map(.message.usage.input_tokens)|add), out: (map(.message.usage.output_tokens)|add), cache_read: (map(.message.usage.cache_read_input_tokens // 0)|add), start: (map(.timestamp)|min), end: (map(.timestamp)|max)}' agent-<id>.jsonl
```

Multiply the token counts by the prices on the official pricing page, fetched at the time of the run. Do not use remembered prices. `workflow-retro deep` does the collection for you with a read-only script and reports tokens; add dollar cost only from freshly fetched prices.

## Extending it

`implement` has no test-writing step and no security-review step. To add them, create your own agents in your project (for example a `test-writer` that names its tests `AC-N: …` inside `describe('<Spec ID>', …)`, which `plan-verifier` already looks for) and tell `implement` to call them in the extra instructions. `plan-verifier` accepts a `no-tests` run and, with tests, builds the spec coverage matrix from those test names.

## Credits

The skills `ears-requirements` and `mermaid-diagram` are adapted for this workflow; `ears-requirements` cites the original EARS paper (Mavin, Wilkinson, Harwood, Novak, IEEE RE 2009).

## Versions

See [CHANGELOG.md](CHANGELOG.md).
