---
name: ears-requirements
description: "Writing and checking testable requirements with EARS (Easy Approach to Requirements Syntax): the five patterns (ubiquitous, event-driven WHEN, state-driven WHILE, unwanted behaviour IF…THEN, optional feature WHERE) and their combinations, turning vague wording into thresholds and deterministic rules, one behaviour per criterion, AC-N numbering with traceability to user stories and a Verify level (unit / integration / e2e / manual). Use when writing or reviewing acceptance criteria in a spec (for example `specs/SPEC-*.md`), when checking whether plan requirements are measurable, or when asked to make a requirement testable. Trigger terms: EARS, acceptance criteria, AC-N, shall, WHEN/WHILE/IF/WHERE, testable requirement, vague requirement, spec."
---

# EARS requirements

EARS (Mavin, Wilkinson, Harwood, Novak — Rolls-Royce, IEEE RE'09) separates the **condition** from the **system response**, so each requirement reads the same way and can be checked by an observer. In specs written with this plugin it is the only allowed form for `## Acceptance criteria (EARS)`.

## The five patterns

| Pattern | Template | Use for | Example |
|---|---|---|---|
| Ubiquitous | `The <actor> shall <response>.` | Always true, no trigger | `The API shall scope every query to the caller's account.` |
| Event-driven | `WHEN <trigger>, the <actor> shall <response>.` | A reaction to a discrete event | `WHEN the user clicks "Place order", the UI shall show the order as pending within 1 s.` |
| State-driven | `WHILE <state>, the <actor> shall <response>.` | Behaviour for the whole duration of a state | `WHILE an order is being processed, the UI shall disable "Place order" for that cart.` |
| Unwanted behaviour | `IF <unwanted condition>, THEN the <actor> shall <response>.` | Failures, invalid input, abuse | `IF the payment provider returns a malformed response, THEN the API shall retry once and then mark the order failed with reason "invalid_provider_response".` |
| Optional feature | `WHERE <feature is enabled>, the <actor> shall <response>.` | Behaviour behind a flag, setting or plan | `WHERE the gift-wrap option is enabled, the API shall add the wrap fee to the order total.` |

Combinations are allowed in a fixed order — `WHERE … WHILE … WHEN/IF …, the <actor> shall …` — e.g. `WHILE the catalog is being re-indexed, WHEN the user opens search, the UI shall show "Indexing…" instead of an empty list.` If a combination needs more than two clauses, split it into two criteria.

Rules:

- Triggers in capitals (`WHEN`, `WHILE`, `IF … THEN`, `WHERE`) and always `shall` — `should`/`may`/`will` are not requirements.
- **Name the actor**: UI, API, worker, scheduler. "The system" only when the actor genuinely doesn't matter.
- **One observable response per criterion.** A second "and" in the response usually means a second AC.
- The response is something an observer can see: a UI state, an HTTP status and body, a row, an event, a log line, a number. Not an internal intention ("shall try to", "shall handle").
- A negative requirement needs a trigger or a scope: `IF the access token is revoked, THEN the API shall not call the provider again for that account until it is reconnected.` — not `shall never fail`.

## Vague → testable

| Vague | Testable |
|---|---|
| "Should work fine on large repositories" | `WHEN the catalog exceeds the indexing threshold, the system shall build the summary from precomputed counts only, without reading every record in full.` |
| "Must not break when the provider is unavailable" | `IF the provider call fails, THEN the system shall show the cached summary with the degradation reason.` |
| "Should suggest what to read first" | `The system shall order the reading list by relevance score, highest first.` |
| "Checkout should be fast" | `WHEN checkout starts, the UI shall show its status within 1 s and the order confirmation for a cart of ≤ 20 items within <N> s.` |
| "Handle errors gracefully" | `IF the provider API returns 401 for the account token, THEN the UI shall show "Reconnect account" and shall not retry automatically.` |
| "Show a nice empty state" | `WHEN a search has no results, the UI shall show "No results found" with the filters that were applied.` |

When a number is missing (`<N>`), don't invent it: take a default, mark it `[NEEDS CLARIFICATION: OQ-N]`, and ask.

**Red flags** — rewrite when you see: "and/or", "etc.", "as appropriate", "if possible", "user-friendly", "intuitive", "quickly", "robust", "seamless", "support X" (support how?), passive voice with no actor, "all"/"any" without a bound, a response that is an implementation step ("shall call `foo()`", "shall add a column").

## Numbering, traceability, verification

Format used in specs:

```
AC-3 (US-1): WHEN …, the UI shall …. · Verify: e2e — observable: <what a checker sees>
AC-4 [Could] (US-1): WHERE …, the API shall …. · Verify: integration — observable: <what a checker sees>
```

- `AC-N` numbers are **stable**: once a draft has been shared, never renumber. A dropped criterion stays as `AC-4 — removed (<reason>)`, so plans and tests that cite it don't silently point at a different requirement.
- Every AC cites at least one user story; every user story has at least one AC.
- An AC inherits its story's priority; write `[Should]`/`[Could]` only when it is lower.
- `Verify:` names the **level** of check, not a file or tool:
  - `unit` — pure logic inside one module (a rule, a threshold, a mapping);
  - `integration` — API + DB, or two modules talking (route → service → repository, service → external adapter);
  - `e2e` — a user-visible flow through the UI;
  - `manual` — only when automation is impractical (visual judgement, third-party UI); add a few words saying why.
- `— observable:` follows the level and says what a checker sees when the AC holds: a UI text or state, an HTTP status + response field, a persisted value read back through the API, an emitted event, a log line. Externally visible only — no function or table names. One line. If you can't name one, the AC isn't testable yet.
  - ✗ `Verify: integration`
  - ✓ `Verify: integration — observable: POST /orders/:id/retry returns 202 and GET /orders/:id shows status "pending"`

## Checklist

- [ ] Every AC matches one of the five patterns (or an allowed combination) and uses `shall`.
- [ ] Actor named; one observable response; no red-flag wording.
- [ ] Numbers, limits and messages are concrete, or marked `[NEEDS CLARIFICATION: OQ-N]`.
- [ ] Every unwanted condition you can think of for an event-driven AC has its own `IF … THEN` AC or an edge-case entry pointing to one.
- [ ] Traceability: each AC → US, each US → ≥1 AC; `Verify: <level> — observable: …` present.
- [ ] No implementation: no file, function, table or library names in the response.
