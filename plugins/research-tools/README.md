# research-tools

A research agent for Claude Code. It answers questions about your repository ("where is this defined, why was it changed, is this claim true?") and about the outside world ("what does the vendor's documentation say?"), and it always reports with evidence and an explicit "could not find" section.

It has no `Write` or `Edit` tool, so it cannot change your files. It reports; you or another agent apply any change.

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install research-tools@dev-digest-ai-marketplace
/reload-plugins
```

## What is inside

| Component | Type | Purpose |
|---|---|---|
| `researcher` | agent | Repository research and external research, interview-first |

Tools: `Read`, `Grep`, `Glob`, `Bash`, `WebFetch`, `WebSearch`. Model: Sonnet.

## How to use it

Ask Claude to use the agent, or let Claude pick it when you say "research", "investigate", "look into" or "find out":

```
Use the researcher agent: where do we handle retries for outgoing HTTP calls, and when was that last changed?
```

```
Use the researcher agent: what does the official documentation say about rate limits for <vendor API>?
```

### Interview mode

If your first message has no concrete question (only a topic, a link, or "look into X"), or the request is ambiguous, the agent asks a short numbered list of clarifying questions before doing any research. After two rounds it stops asking and states its working assumption at the top of the report. When another agent calls it and no user is available, it skips the interview and states its assumption.

### Two research modes

| Mode | Answers | Tools it uses |
|---|---|---|
| Repository | Where something is defined, how it behaves today, when and why it changed | `Grep`, `Glob`, `Read`, read-only `git log` / `blame` / `diff` / `grep` |
| External | Library and framework docs, vendor capabilities, standards, news, pricing | `WebSearch`, `WebFetch`, preferring official sources |

Every finding is labelled with the mode that produced it.

### Report

A repository report has: Question, Findings (one claim each), Evidence (`file:line` plus a short quote), References (commits, PRs, documents), Could not find.

An external report has: Question, Findings, Evidence (quote or close paraphrase), References (URLs actually retrieved, with date for time-sensitive facts), Could not find.

## Works with the other plugins

`sdd-engineering` declares this plugin as a dependency. Its `spec-creator` and `implementation-planner` agents call `research-tools:researcher` when a question needs more than a few targeted reads. You can also use the agent on its own.

## What is and is not enforced

- No `Write` / `Edit` tool: enforced by the agent's tool list.
- `Bash` is available for read-only inspection (`git log`, `git blame`, `git diff`, `git grep`, `ls`, `cat`, `grep`, `find`). The agent is instructed not to write files or change git state, but this plugin installs no hooks, so that rule is not technically enforced. Review its commands if you run it with broad permissions.
- Fetched pages and repository text are treated as data, not instructions.

## Versions

See [CHANGELOG.md](CHANGELOG.md).
