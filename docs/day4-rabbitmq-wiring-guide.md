# RabbitMQ wiring guide (Day 4 Step 1)

How RabbitMQ is integrated in this **monorepo**—what was coded, where to read it, and how to run it locally. Focus: messaging only (HTTP inventory is unchanged).

For lab exercises and troubleshooting, see also [day4-step1-rabbitmq.md](./day4-step1-rabbitmq.md).

## Big picture

Three runtime pieces matter for RabbitMQ in Step 1:

| Process | Nest app | Role |
|--------|----------|------|
| Broker | Docker `lab-rabbitmq` | Message hub |
| Producer | `apps/order-service` | Publishes `order.created` after DB save |
| Consumer | `apps/event-consumer` | Subscribes to queue, logs payload |

Shared code lives in **`libs/messaging`** (same pattern as `libs/http`, `libs/app-env`). Apps import the public API from `libs/messaging/src/index.js`. TypeScript includes the lib via each app’s `tsconfig.app.json` `include` paths—not a separate published npm package.

```
POST /orders → order saved (PENDING)
    → OrderCreatedPublisher.publish()
    → exchange orders.events (routing key order.created)
    → queue order.created.log
    → OrderCreatedConsumer → Logger

(still) → InventoryHttpClient.reserveStock()  … HTTP, unchanged
```

Publish runs **after** the order row is written, **before** the inventory HTTP call. Broker failures are **logged only**; `POST /orders` still succeeds.

## Broker terminology (this lab)

| Term | Value / class |
|------|----------------|
| Exchange | `orders.events` (topic, durable) |
| Routing key | `order.created` |
| Queue | `order.created.log` |
| Binding | Queue receives messages from exchange when routing key is `order.created` |

## Suggested reading order

### 1. Broker and configuration

| File | Purpose |
|------|---------|
| [`infrastructure/docker/compose.yaml`](../infrastructure/docker/compose.yaml) | `rabbitmq:3-management`, ports **5672** (AMQP), **15672** (UI), credentials `lab` / `lab` |
| [`.env.example`](../.env.example) | `RABBITMQ_URL`, exchange/queue/key names, `RABBITMQ_ENABLED` |
| [`libs/app-env/src/schemas/messaging.env.schema.ts`](../libs/app-env/src/schemas/messaging.env.schema.ts) | Zod env validation |
| [`libs/app-env/src/schemas/order.env.schema.ts`](../libs/app-env/src/schemas/order.env.schema.ts) | Order app env = DB + HTTP + messaging |
| [`libs/app-env/src/schemas/consumer.env.schema.ts`](../libs/app-env/src/schemas/consumer.env.schema.ts) | Consumer app env = messaging only |

Config flow: `process.env` → `AppEnvModule` → `useFactory` → `RabbitMqMessagingOptions`.

### 2. Shared library layout

Entry: [`libs/messaging/src/index.ts`](../libs/messaging/src/index.ts)

```
libs/messaging/src/
  events/           # Zod event schemas (order.created)
  publishers/       # OrderCreatedPublisher
  rabbitmq/         # connection, topology, Nest RabbitMqMessagingModule
  readiness/        # wait for broker on startup
```

### 3. Topology on the broker

| File | Purpose |
|------|---------|
| [`libs/messaging/src/rabbitmq/topology.ts`](../libs/messaging/src/rabbitmq/topology.ts) | `assertExchange` (topic) + `assertQueue` + `bindQueue` — idempotent at startup |
| [`libs/messaging/src/rabbitmq/messaging.constants.ts`](../libs/messaging/src/rabbitmq/messaging.constants.ts) | `RABBITMQ_MESSAGING_OPTIONS`: `enabled`, `url`, `exchange`, `routingKey`, `queue` |

Both producer and consumer call topology assert on connect so either app can start first.

### 4. Connection and Nest modules

| File | Purpose |
|------|---------|
| [`libs/messaging/src/rabbitmq/connection.service.ts`](../libs/messaging/src/rabbitmq/connection.service.ts) | `amqplib` connect + channel + topology; skips if `enabled: false` |
| [`libs/messaging/src/rabbitmq/messaging.module.ts`](../libs/messaging/src/rabbitmq/messaging.module.ts) | Global module: connection + `OrderCreatedPublisher` |
| [`libs/messaging/src/rabbitmq/wait-for-rabbitmq.ts`](../libs/messaging/src/rabbitmq/wait-for-rabbitmq.ts) | Retry loop until broker accepts AMQP |
| [`libs/messaging/src/readiness/readiness.service.ts`](../libs/messaging/src/readiness/readiness.service.ts) | `OnModuleInit` readiness before apps use the broker |

Dependency: **`amqplib`** (root `package.json`).

### 5. Event contract

| File | Purpose |
|------|---------|
| [`libs/messaging/src/events/order-created.event.ts`](../libs/messaging/src/events/order-created.event.ts) | `eventType`, `orderId`, `productId`, `quantity`, `status`, `occurredAt` |

### 6. Producer — order service

1. [`apps/order-service/src/app.module.ts`](../apps/order-service/src/app.module.ts) — `RabbitMqReadinessModule` + `RabbitMqMessagingModule.forRootAsync`
2. [`libs/messaging/src/publishers/order-created.publisher.ts`](../libs/messaging/src/publishers/order-created.publisher.ts) — `channel.publish` with persistent JSON
3. [`apps/order-service/src/orders/orders.service.ts`](../apps/order-service/src/orders/orders.service.ts) — `publish` after `createOrder`, try/catch + warn

### 7. Consumer — event-consumer app

| File | Purpose |
|------|---------|
| [`apps/event-consumer/src/main.ts`](../apps/event-consumer/src/main.ts) | `NestFactory.createApplicationContext` (no HTTP server) |
| [`apps/event-consumer/src/app.module.ts`](../apps/event-consumer/src/app.module.ts) | Same messaging modules as order service |
| [`apps/event-consumer/src/order-created.consumer.ts`](../apps/event-consumer/src/order-created.consumer.ts) | `consume` → Zod parse → log → `ack` |

### 8. Monorepo tooling

| File | Purpose |
|------|---------|
| [`nest-cli.json`](../nest-cli.json) | Projects: `order-service`, `inventory-service`, `event-consumer` |
| [`package.json`](../package.json) | `pnpm start:order`, `pnpm start:consumer:dev`, `pnpm db:up` |
| [`apps/order-service/tsconfig.app.json`](../apps/order-service/tsconfig.app.json) | Includes `libs/messaging` sources |
| [`apps/event-consumer/tsconfig.app.json`](../apps/event-consumer/tsconfig.app.json) | Same |

### 9. Tests and broker-off mode

| File | Purpose |
|------|---------|
| [`test/e2e-setup.ts`](../test/e2e-setup.ts) | Forces `RABBITMQ_ENABLED=false` for e2e |
| [`apps/order-service/src/orders/orders.service.spec.ts`](../apps/order-service/src/orders/orders.service.spec.ts) | Mocks `OrderCreatedPublisher` |

`RABBITMQ_ENABLED` must parse string `"false"` correctly (see messaging env schema)—not `z.coerce.boolean()`.

## Run locally

```bash
pnpm db:up
# Copy messaging vars from .env.example → .env, set RABBITMQ_ENABLED=true

pnpm start:consumer:dev   # terminal 1
pnpm start:inventory      # terminal 2 (HTTP reserve only)
pnpm start:order          # terminal 3
```

- Management UI: http://127.0.0.1:15672 (login `lab` / `lab`)
- Create orders (Swagger/curl); consumer logs `order.created orderId=...`

## Environment variables

| Variable | Example | Who uses it |
|----------|---------|-------------|
| `RABBITMQ_ENABLED` | `true` | Order + consumer (skip broker when `false`) |
| `RABBITMQ_URL` | `amqp://lab:lab@127.0.0.1:5672` | Order + consumer |
| `ORDER_EVENTS_EXCHANGE` | `orders.events` | Order + consumer |
| `ORDER_CREATED_ROUTING_KEY` | `order.created` | Order + consumer |
| `ORDER_CREATED_QUEUE` | `order.created.log` | Order (assert) + consumer (consume) |

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Order service won’t start | `RABBITMQ_ENABLED=true` but broker down — run `pnpm db:up` |
| 201 on POST /orders, no consumer logs | Consumer not running or `RABBITMQ_ENABLED=false` on order |
| Messages pile up in queue | Consumer stopped — start `pnpm start:consumer:dev` |
| Orders work when broker is down | By design — publish is non-fatal |

## Out of scope (Step 1)

- Inventory reacting to RabbitMQ (still HTTP only)
- Transactional outbox (`outbox_events` tables exist in DB schema but are unused here)
- Replacing or removing HTTP reservation

## Mental model

- **Monorepo:** multiple apps under `apps/`, shared code under `libs/`. Messaging is opt-in via `AppModule` imports.
- **RabbitMQ:** separate broker process (Docker). Apps use `amqplib` as clients. Producers publish to an **exchange**; **bindings** route to **queues**; consumers read from queues.
- **Step 1 goal:** observe async `order.created` alongside synchronous HTTP—not yet unified sagas or event-driven inventory.