# Day 4 Step 1 — Introduce RabbitMQ

Asynchronous messaging alongside the existing **HTTP inventory reservation** flow (unchanged).

## Terminology

| Term | In this lab |
|------|-------------|
| **Producer** | Order Service (`OrderCreatedPublisher`) |
| **Exchange** | `orders.events` (topic, durable) |
| **Routing key** | `order.created` |
| **Queue** | `order.created.log` |
| **Binding** | Queue listens to exchange for routing key `order.created` |
| **Consumer** | `event-consumer` app (`OrderCreatedConsumer`) |

## Topology

```
Order Service  --publish-->  orders.events (topic)  --binding-->  order.created.log  --consume-->  Event Consumer
```

Publish happens **after** the order row is saved (`PENDING`), **before** the inventory HTTP call. Broker failures are logged and do not fail `POST /orders`.

## Run locally

```bash
pnpm db:up                    # Postgres + RabbitMQ
pnpm db:order:migrate
pnpm db:inventory:migrate
pnpm start:consumer:dev       # terminal 1
pnpm start:inventory          # terminal 2
pnpm start:order              # terminal 3
```

- Management UI: http://127.0.0.1:15672 (user `lab`, password `lab`)
- Create orders via Order Swagger; watch consumer logs for `order.created` lines.

## Environment

See `.env.example`: `RABBITMQ_URL`, `ORDER_EVENTS_EXCHANGE`, `ORDER_CREATED_ROUTING_KEY`, `ORDER_CREATED_QUEUE`, `RABBITMQ_ENABLED`.

## Troubleshooting

| Symptom | Likely cause |
|---------|----------------|
| Order API 201 but no consumer logs | Consumer not running, or `RABBITMQ_ENABLED=false` on order service |
| Order service fails on boot | Broker down with `RABBITMQ_ENABLED=true` — run `pnpm db:up` |
| Messages piling up in queue | Consumer stopped; start `pnpm start:consumer:dev` |
| Orders still work when broker down | By design — publish errors are non-fatal |

## Out of scope (Step 1)

- Replacing HTTP reservations with message-driven inventory
- Transactional outbox (`outbox_events` tables are unused for now)