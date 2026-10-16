---
name: implement
description: Executes an approved Implementation Plan end to end from the main session: implementer (single- or multi-agent with wave gates) → completeness check (plan-verifier) → architecture review (architecture-review:architecture-reviewer) → fix iterations until the review is clean → Package gates → final verification against the plan and its spec's acceptance criteria. Use when the user invokes /sdd-engineering:implement <plan path>, or passes a *.trace.md run log to resume. Spec writing (spec-creator) and planning (implementation-planner) are run separately by hand before this. Pauses for findings triage and caps; never commits.
disable-model-invocation: true
argument-hint: "<plan path | run log path (*.trace.md)> [extra instructions]"
---

# /implement — run an approved plan

You are the **orchestrator**. You call the agents with the `Agent` tool, ask the user at gates with the question tool, and keep a run log. You don't write product code yourself — the agents do. The agents are:

- `sdd-engineering:implementer`
- `sdd-engineering:plan-verifier`
- `architecture-review:architecture-reviewer`

Out of scope here — the user runs them by hand beforehand: `spec-creator` (spec) and `implementation-planner` (plan). If the plan is missing or wrong, stop and tell the user to re-plan; never plan yourself. This run has no test-writing step and no security-review step unless the user adds one (see *Tests* and *Phase 3*).

Arguments: `$ARGUMENTS`

## 0. Start

1. **Input.** A plan file → new run. A `*.trace.md` run log → resume at the first phase not marked `done`. Anything else in the arguments is extra instructions from the user, passed verbatim to the implementer. No plan → ask for its path and stop. Plans live in the folder the user names; `docs/plans/` is the default.
2. **Read the plan header** only: execution mode, `Sources:` (the spec path, if any), §6a waves, §6b Package gates. If the plan has an unresolved blocking question or no execution mode → stop, tell the user to finish planning.
3. **Preflight.**
   - `git branch --show-current` — on the repository's default branch (`main`, `master` or whatever it uses), stop and ask the user to create a working branch.
   - `git status --porcelain` — not empty → ask: commit/stash first (recommended) or continue and treat those files as the user's.
   - Record `git rev-parse HEAD` as the **base sha**.
4. **Run log** — create `<plan-name>.trace.md` next to the plan (exists → `-run2`) from the template below.
5. **Context budget.** From every agent report keep only: status/verdict, counts, paths, and its **Handoff summary**, verbatim. Never paste full reports into later prompts.

## Phase 1 — Implement

- **single-agent** → one `implementer`: plan path, base sha, extra instructions. Then you run the §6b Package gates yourself with `Bash` and record exit codes and output tails.
- **multi-agent** → per wave, one `implementer` per task **in one message** (parallel), each with plan path + task ID. After each wave you run the §6b gates of the packages the wave touched.
- Implementer `blocked` → show the user; the fix is a new plan version (by hand). Red gate or `partial` → **Fix call** with the failing tail, re-run the gate. Max 2, then ask.

## Phase 2 — Completeness check

**Skip it for small plans** — `single-agent` mode **and** ≤3 tasks: the implementer's own Acceptance check covers completeness there, and Phase 5 re-checks every row anyway. Log "skipped: small plan (n tasks)" and go to Phase 3.

`plan-verifier` in **completeness mode**: plan path, spec path, base sha, "Package gates were green at <sha> — don't re-run them; no test-writing step ran in this run (`no-tests`)."

`Missing` / `Partial` → Fix call with its §7 Handoff verbatim → re-run plan-verifier on those rows only. Max 2. An AC missing from the plan → ask the user: re-plan by hand, or accept as Deferred.

## Phase 3 — Review

- `architecture-review:architecture-reviewer` — plan path, base sha, the changed-file list from the Implementation Report(s).
- **Security review:** this plugin does not include a security reviewer. If the user asked for one in the arguments, or the project provides a security-review agent, call it in the same message as the architecture review, **only if** the diff touches a route, authorization, input parsing, queries, secrets, outbound requests, model prompts or rendered HTML. Otherwise log "skipped: no security reviewer in this run" and mention in the final summary that the user should run a security review separately.

## Phase 4 — Fix iterations (review → fix → delta re-review)

Loop per review source until clean or capped.

**4a Triage** — one question call per iteration:

| Finding | Default | Ask? |
|---|---|---|
| `critical`, `major` | fix | no |
| `minor` | fix if in a line this change added | multi-select: which to fix now |
| `nit` | skip, log | same multi-select, unchecked |
| Needs human judgement | — | fix / accept as tradeoff / not an issue |
| Two findings contradict | — | which rule wins |

Rejected findings are logged as **accepted** (with the reason) and passed to later re-reviews as "don't re-flag".

**4b Fix** — one Fix call with all accepted findings of all sources, grouped by file (multi-agent plans: one per package, in parallel).

**4c Delta re-review** — re-run only the source that had findings: "Delta re-review. Previous findings: <Handoff lines>. Accepted (don't re-flag): <list>. Fix diff: files <list>. Base sha: <sha>."

**4d Stop rules**
- **Clean** — no critical/major open and every chosen minor resolved.
- **Cap** — 3 iterations per source, then ask: one more / accept the rest as tradeoffs / re-plan by hand.
- **Oscillation** — a `resolved` finding comes back, or a fix introduces a new finding with the same check ID → stop and ask.
- **Plan conflict** — the implementer says a fix needs a plan change → ask: widen the fix scope (list files) / re-plan / accept.
- After the last fix: run the §6b Package gates once. Red → Fix call with the tail (counts toward the cap).

## Phase 5 — Final verification

`plan-verifier` in full mode with `no-tests`: plan path, spec path, base sha, "re-check the rows that weren't Met in the completeness run, the rows whose files changed since, all Package gates, and the spec coverage matrix".

If Phase 2 was skipped, tell it to check every row (there is no earlier matrix).

`Missing`/`Partial` → Fix call + re-run (max 2), then ask. `Unverifiable` rows go to the user with commands.

**Model.** `plan-verifier` runs on Sonnet (frontmatter). If the user disputes a status, or the verdict hinges on a judgement call (Partial vs Met on a multi-clause criterion), re-run it for **those rows only** with the `Agent` tool's `model: "opus"` override — never the whole matrix.

## Phase 6 — Close

Finish the run log and print: plan + spec paths, verdict, AC counts, iterations per source, accepted tradeoffs, and **for the user**: run the Unverifiable checks; the ACs without tests (see *Tests*); set `Status: implemented` in the spec if plan-verifier §8 says ready; run any pre-PR review and a security review if none ran; commit. Never commit, push or open a pull request.

## Tests

No test-writing step runs in this skill. Consequences, stated in the final summary:
- Only the tests the plan's tasks own (written by the implementer) and the existing suites run.
- Spec ACs with `Verify: unit`/`integration` are judged by plan-verifier from code evidence, not from `AC-N:` tests; list them as "no AC test" so the user can add tests later.

## Fix call

A `SendMessage` continuation of the implementer that wrote the code when it's still available and it's the first fix (warm context, cheaper); otherwise a new `sdd-engineering:implementer` call.

Before sending it, grep the plan-owned files for the same pattern as each finding (the same call, helper or race). Add the Owned paths of every task with a hit to the Fix scope in the first message, so no follow-up is needed for the same fix in another file.

```
Fix call. Plan: <path>. Base sha: <sha>. Do not re-implement tasks; apply only these fixes.
Findings (verbatim handoff lines):
<lines>
Fix scope (you may edit only these files): <files cited in the findings> + the Owned paths of the tasks they belong to.
Accepted — don't touch: <list>.
Run the Done-conditions of the touched tasks. Report per finding: fixed (file:line) / not fixed (why) / needs a plan change.
```

## Run log

`<plan-name>.trace.md`, next to the plan — written only by you, updated after every phase, so `/sdd-engineering:implement <run log>` can resume in a new chat.

```markdown
# Implement run — <feature>
Spec: <path> (status) · Plan: <path> · Branch: <branch> · Base sha: <sha> · Mode: single-agent | multi-agent · Tests: no test-writing step

| Phase | Status | Agent calls | Result |
|---|---|---|---|
| 1 Implement | | implementer ×n, gate runs ×n | gates green at <sha> |
| 2 Completeness | | plan-verifier (or skipped: small plan) | n Met / n fixed |
| 3 Review | | architecture (+ security or "skipped: why") | findings counts |
| 4 Fix iterations | | per source: iterations | clean / capped |
| 5 Final verification | | plan-verifier | verdict, AC counts |
| 6 Close | | | |

## Findings ledger
| ID | Source | Severity | Iteration found | Decision (fix / accepted: reason / nit-skipped) | Resolved in iteration |

## For the user
- Unverifiable: <row> — <how to verify>
- ACs without tests: <AC-…>
```
