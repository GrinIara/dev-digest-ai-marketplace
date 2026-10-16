# Backend layering — worked example & enforcement sketch

## Worked example: an `orders` module

A small module traced against the layer map in `SKILL.md` (folder names are illustrative; use the project's own):

```
src/modules/orders/
  routes.ts       # delivery
  service.ts      # application / use-case
  repository.ts   # data access
src/adapters/payment/
  stripe.ts       # production adapter for PaymentGateway
src/adapters/mocks.ts   # in-memory PaymentGateway for tests
```

- **Delivery** — `routes.ts`: imports `fastify`, the shared schemas for params/body, and `OrderService`. No DB, no adapter, no Drizzle import. It validates input, calls `service.placeOrder(...)`, and shapes the HTTP response.
- **Application / use-case** — `service.ts`: constructed with its dependencies (an `OrderRepository` and a `PaymentGateway` port). Orchestrates "place order": load items, compute the total, charge through the port, persist the order. It imports neither Fastify nor Drizzle.
- **Data access** — `repository.ts`: the only file in this module importing `drizzle-orm` and the DB schema. It exposes domain-shaped methods such as `insertOrder` and `findOrderById`.
- **Port** — `PaymentGateway` is an interface defined on the inner side, for example `charge(amount, token): Promise<ChargeResult>`.
- **Adapters** — a production adapter implements `PaymentGateway` against the payment provider's SDK; a mock implements it in memory for unit tests.
- **Composition root** — builds the production adapter, passes it and the repository into `OrderService`, and registers the routes. It is the only place that knows every concrete class.

```ts
// service.ts — depends on the port, never on the vendor SDK
export interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<{ id: string }>;
}

export class OrderService {
  constructor(
    private readonly repo: OrderRepository,
    private readonly payments: PaymentGateway,
  ) {}

  async placeOrder(input: PlaceOrderInput) {
    const total = computeTotal(input.items);
    const charge = await this.payments.charge(total, input.paymentToken);
    return this.repo.insertOrder({ ...input, total, chargeId: charge.id });
  }
}
```

Nuance: the port (`PaymentGateway`) is swapped for a mock in unit tests, while the repository is usually a concrete class exercised against a real database in integration tests. The two shapes differ on purpose; follow the project's existing convention rather than forcing both into one pattern.

If `OrderRepository` methods return raw Drizzle-inferred row types, that is acceptable while the module is small and has one consumer. Introduce a mapper to a domain/DTO type when the row shape and its callers' needs diverge.

## Enforcement sketch

If you want to promote these rules from "followed in review" to "CI fails on violations", a starting `dependency-cruiser` ruleset looks roughly like this (`eslint-plugin-boundaries` can express the same constraints):

```js
// .dependency-cruiser.cjs (SKETCH — adjust the paths to the project's layout)
module.exports = {
  forbidden: [
    {
      name: 'service-no-fastify-or-drizzle',
      comment: 'service.ts must not depend on Fastify or Drizzle directly',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/service\\.ts$' },
      to: { path: '^(node_modules/fastify|node_modules/drizzle-orm|src/db/schema)' },
    },
    {
      name: 'routes-no-db-or-adapters',
      comment: 'routes.ts must not touch the DB or a concrete adapter directly',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/routes\\.ts$' },
      to: { path: '^(src/db|src/adapters/(?!mocks\\.ts))' },
    },
    {
      name: 'only-repository-touches-drizzle',
      comment: 'only repository files may import drizzle-orm or the schema',
      severity: 'error',
      from: { path: '^src/modules/[^/]+/(?!repository)' },
      to: { path: '^(node_modules/drizzle-orm|src/db/schema)' },
    },
  ],
};
```

This is illustrative, not tested against any real dependency graph. Run it in report-only mode first to see how many violations already exist before turning any rule into a CI failure.
