# engineering-paved-path

A set of engineering skills for TypeScript web projects. It gives Claude the working rules for React, Next.js, Fastify, Drizzle and PostgreSQL, Zod, TypeScript, layered architecture, component testing and security, so it follows the same practices on every task.

It contains only skills: no agents, no hooks, no scripts, no MCP servers.

## Install

```
/plugin marketplace add GrinIara/dev-digest-ai-marketplace
/plugin install engineering-paved-path@dev-digest-ai-marketplace
/reload-plugins
```

## What is inside

| Skill | Area | Use it for |
|---|---|---|
| `react-best-practices` | Frontend | React anti-patterns, state management, hook rules, current practices |
| `next-best-practices` | Frontend | Next.js file conventions, Server/Client Component boundaries, data patterns, async APIs, metadata, error handling, route handlers, image and font optimization, bundling |
| `frontend-ui-architecture` | Frontend | Where components, hooks, utilities and constants live in React and Next.js code, and when to split a component |
| `react-testing-library` | Testing | Writing and reviewing React component and hook tests with React Testing Library and Vitest |
| `fastify-best-practices` | Backend | Fastify routes, plugins, JSON-schema validation, hooks, error handling, serialization, logging, performance, authentication, testing and deployment |
| `backend-onion-architecture` | Architecture | Which layer backend code belongs in and which direction dependencies may point (onion / hexagonal layering) |
| `drizzle-orm-patterns` | Data | Drizzle schema definition, queries, relations, transactions and migrations |
| `postgresql-table-design` | Data | PostgreSQL schema design: data types, indexing, constraints, performance |
| `zod` | Full stack | Zod schemas, parsing, error handling and type inference |
| `typescript-expert` | Full stack | Type-level programming, `tsconfig` choices, type-check performance, migrations |
| `security` | Security | Web application security based on the OWASP Top 10:2025: authentication, injection, uploads, secrets |

## How to use it

Skills load by themselves when a task matches their description, for example when you ask Claude to add a Fastify route or review a React component. You do not have to call them.

To ask for one explicitly, use its namespaced name:

```
Use the engineering-paved-path:fastify-best-practices skill to review this route.
```

`backend-onion-architecture` and `frontend-ui-architecture` are marked as not user-invocable: Claude and other agents load them, they do not appear as slash commands.

## Works with the other plugins

| Plugin | How it uses this one |
|---|---|
| `architecture-review` | Its reviewer loads the architecture, framework and data skills that match the files in a diff. Declares this plugin as a dependency. |
| `sdd-engineering` | Its planner and implementer load the skills that match each task's scope. Declares this plugin as a dependency. |

Installing either of them installs this plugin too.

## Notes

- The architecture skills describe general layering with typical folder names as examples. If your project uses other names, the project's own conventions win.
- Every installed skill adds its description to Claude's context on each turn. Install this plugin if you work with the stack it covers.
- `react-testing-library` is a long skill (about 600 lines); the rest are shorter.

## Credits

Several skills are based on public work and keep their attribution in the skill files:

- `fastify-best-practices` carries a `tile.json` naming the `mcollina/fastify-best-practices` package it is based on.
- `security` is based on the OWASP Top 10:2025; its `references.md` lists the public sources it draws on.
- `typescript-expert` is marked `source: community`.

## Versions

See [CHANGELOG.md](CHANGELOG.md).
