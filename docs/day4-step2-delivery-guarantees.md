# Day 4 Step 2 — Acknowledgments and delivery guarantees

Hands-on lab: **at-least-once delivery**, **ack/nack**, **durable topology**, **persistent messages**, and **prefetch**. Assumes [Day 4 Step 1](./day4-step1-rabbitmq.md) is running (`order.created` publish + consume).

**Code map:** consumer ack flow in [`apps/event-consumer/src/order-created.consumer.ts`](../apps/event-consumer/src/order-created.consumer.ts); durability in [`libs/messaging/src/rabbitmq/topology.ts`](../libs/messaging/src/rabbitmq/topology.ts) and [`libs/messaging/src/publishers/order-created.publisher.ts`](../libs/messaging/src/publishers/order-created.publisher.ts).

## Concepts

| Idea | In this lab |
|------|-------------|
| **Manual ack** | Consumer uses `noAck: false`; broker removes a message only after `channel.ack`. |
| **Ready** | Messages waiting for a consumer (Management UI). |
| **Unacked** | Delivered to a consumer but not yet acked/nacked. |
| **At-least-once** | If the consumer crashes before `ack`, or nacks with requeue, the message can be **delivered again** (`redelivered=true` in logs). |
| **Idempotency** | Handlers must tolerate duplicate delivery (same `orderId` processed twice should be safe). This consumer only logs—real services need dedupe or upserts. |

## What is already durable / persistent

| Piece | Setting | File |
|-------|---------|------|
| Exchange | `durable: true` | `topology.ts` |
| Queue | `durable: true` | `topology.ts` |
| Message bodies | `persistent: true` on publish | `order-created.publisher.ts` |
| Broker data | Docker volume `rabbit_data` | `infrastructure/docker/compose.yaml` |

After `docker compose restart rabbitmq`, exchange/queue and **persistent** messages on disk should survive (non-persistent messages could be lost on restart).

## Consumer env (Step 2)

| Variable | Default | Purpose |
|----------|---------|---------|
| `RABBITMQ_CONSUMER_PREFETCH` | `1` | Max unacked messages RabbitMQ will push to this consumer. |
| `CONSUMER_PROCESSING_DELAY_MS` | `0` | Sleep before `ack` (crash-before-ack experiment). |
| `CONSUMER_INVALID_NACK_REQUEUE` | `false` | Invalid JSON/schema → `nack` with or without requeue. |

See [`.env.example`](../.env.example) (commented).

## Management UI

Open http://127.0.0.1:15672 → **Queues** → `order.created.log`.

Watch **Ready**, **Unacked**, and **Total** during each experiment below.

## Experiment playbook

Prerequisites: `pnpm db:up`, consumer + order + inventory running (see Step 1 doc).

### Consumer stopped, then publish

1. Stop `pnpm start:consumer:dev`.
2. Create several orders (Swagger on order service).
3. **Observe:** Ready/Total increase; Unacked stays 0.

### Restart consumer

1. Start `pnpm start:consumer:dev` again.
2. **Observe:** Ready drops; consumer logs `order.created orderId=...`; messages are acked.

### Crash before `ack`

1. Set `CONSUMER_PROCESSING_DELAY_MS=10000` in `.env`; restart consumer.
2. Create an order; while the consumer is in the 10s delay, stop it abruptly (`kill -9` or Ctrl+C may not always leave messages unacked—prefer `kill -9` on the node PID during the delay).
3. Restart consumer.
4. **Observe:** Message redelivered; log line includes `redelivered=true`.

### `nack` without requeue (default)

1. Ensure `CONSUMER_INVALID_NACK_REQUEUE=false`.
2. In Management UI: **Queues** → `order.created.log` → **Publish message** with payload `not-json` or `{}` (invalid schema).
3. **Observe:** Consumer error log; message removed from queue (not retried forever).

### `nack` with requeue

1. Set `CONSUMER_INVALID_NACK_REQUEUE=true`; restart consumer.
2. Publish the same invalid payload to the queue.
3. **Observe:** Consumer loops nack/requeue; Ready/Unacked fluctuate. Reset flag to `false` when done.

### Restart RabbitMQ

1. With messages in the queue (stop consumer, publish orders).
2. From repo root: `docker compose -f infrastructure/docker/compose.yaml restart rabbitmq` (or your `pnpm db:up` compose path).
3. Start consumer.
4. **Observe:** Queue and durable messages still present; backlog drains.

### Prefetch 1 vs 10

1. Set `RABBITMQ_CONSUMER_PREFETCH=10`; restart consumer.
2. Stop consumer, burst several orders (or publish via exchange).
3. Start consumer with a large `CONSUMER_PROCESSING_DELAY_MS` (e.g. 5000) to keep messages in flight.
4. **Observe:** Unacked capped at about prefetch (10). Repeat with `RABBITMQ_CONSUMER_PREFETCH=1` — at most one Unacked while slow.

## Completion goal

You should see how **acks** commit delivery, **nacks** reject or requeue, **durable + persistent** settings survive broker restarts, and **prefetch** limits in-flight work—and why consumers must handle **duplicate** `order.created` events.

## Out of scope (later labs)

- Dead-letter queues (DLQ)
- Retry policies / backoff
- Transactional outbox

Next concepts build on this baseline delivery behavior.