---
name: backend-onion-architecture
description: "Provides onion/hexagonal layering guidance for TypeScript backends built with Fastify and a SQL query layer such as Drizzle: which layer new code belongs in, how routes, service, repository and adapters may depend on each other, and where the dependency direction must not be violated. Use when adding a new Fastify module, adding or changing a repository method, adding a port or adapter, deciding where business logic belongs, or reviewing a module for layer violations. Does NOT cover Fastify request-lifecycle mechanics (see fastify-best-practices), Drizzle query syntax (see drizzle-orm-patterns), or frontend organization (see frontend-ui-architecture)."
user-invocable: false
version: 1.0.0
---

# Backend Onion Architecture

Architecture guidance for TypeScript backends built with Fastify and a SQL query layer such as Drizzle. This skill is deliberately narrow: it answers **which layer a piece of backend code belongs in and which direction it is allowed to depend**, not how to write a Fastify route or a Drizzle query correctly. For those, defer to `fastify-best-practices` and `drizzle-orm-patterns`.

A worked example and a CI-enforcement sketch: [references/backend-layering.md](./references/backend-layering.md).

## The one rule underneath everything else

Across Onion, Hexagonal, and Clean Architecture writing, one rule is non-negotiable regardless of which vocabulary a source uses:

> **Dependencies point inward, never outward. Inner layers define interfaces; outer layers implement them.** Code closer to the domain must never import from — or even know the name of — a concrete Fastify type, a Drizzle table, or a specific adapter's implementation class.

If the project already follows most of this, it is **not a blank slate**: keep new code consistent with the existing pattern rather than introducing a new one.

## Layer map

The folder names below are typical examples. **The project's own folder names and conventions win**; map each layer to wherever the project already puts it.

| Layer | Typical location | Rule |
|---|---|---|
| Domain / contracts (innermost) | for example `src/contracts/*` (schemas + inferred types) | No imports of Fastify, Drizzle, or any adapter. Pure shape definitions. |
| Application / use-case | for example `modules/<name>/service.ts` | Orchestration only: calls the module's repository and its ports. **Never** imports `fastify`, `drizzle-orm`, or the DB schema directly. |
| Data access | for example `modules/<name>/repository.ts` | The *only* files allowed to import the query layer and DB schema for that domain. |
| Ports / adapters (outer ring) | for example `src/adapters/<name>/` (production implementations) plus a mock per port, wired in the composition root | A port interface is defined on the inner side; each adapter implements it. For a new external integration add a port, a production adapter and a mock. Do not add a second DI mechanism if the project already has one. |
| Delivery (outermost) | for example `modules/<name>/routes.ts` | Schema validation of `params`/`body` and HTTP translation only. No direct DB or adapter imports, no business rules — call the service and shape the response. |
| Composition root | for example `src/composition-root.ts` and `src/app.ts` | The one place allowed to know about every layer. A new module means a new import and registration here. |

Repositories and adapter ports are two different dependency shapes: adapters need swappable mocks for unit tests, while repositories are commonly validated against a real database in integration tests. Follow whichever convention the project already uses and do not conflate the two.

## A pure core as the reference

A use-case layer with no DB, network, or filesystem access, whose only side effects come through injected ports, is what a fully dependency-free Onion core looks like. When in doubt about how "pure" a service layer should be, aim at that rather than at a hypothetical ideal.

## Adding a new module — apply the layers, but proportionally

1. Domain shape → a contract (schema plus inferred type).
2. Orchestration → `service.ts`, calling a repository and injected ports.
3. Persistence → `repository.ts` (split per aggregate once a domain has several).
4. HTTP → `routes.ts`, registered in the composition root.
5. New external integration → a port interface, a production adapter, a mock, wired in the composition root.

**Caveat that matters more than the rule itself**: full repository-interface + DTO-mapping layers are overkill for a genuinely thin CRUD-over-one-table module — do not add ceremony a module does not need. The dependency direction (routes never touch the query layer, the service never touches Fastify) is not optional; how many discrete files or interfaces a module needs to express that direction scales with the module's actual complexity.

## Common violations to flag in review

- A route handler importing the DB schema or a Drizzle table directly instead of going through the service and repository.
- A service importing a concrete adapter class (for example a vendor-specific client) instead of the port.
- A repository method returning a raw Drizzle-inferred row type to a caller outside its module when the shape needs to diverge from the DB row (map to a domain/DTO type instead).
- Reaching for a new DI library, decorator-based container, or global singleton instead of extending the existing port + production/mock pattern.
- Business rules (validation beyond schema shape-checking, scoring, orchestration order) leaking into `routes.ts`.

## Enforcing the rules in CI

`dependency-cruiser` or `eslint-plugin-boundaries` can turn these rules into CI checks (forbidding service → `drizzle-orm`, routes → DB layer, and so on). A starting sketch is in [references/backend-layering.md](./references/backend-layering.md). Run it in report-only mode first to see how many violations already exist before making any rule fail the build.
