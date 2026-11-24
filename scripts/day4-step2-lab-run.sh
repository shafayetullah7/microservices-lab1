#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
QURL='http://127.0.0.1:15672/api/queues/%2F/order.created.log'
REPORT="$ROOT/docs/day4-step2-lab-run.md"

qstats() {
  curl -s -u lab:lab "$QURL" | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"consumers={d['consumers']} ready={d['messages_ready']} unacked={d['messages_unacknowledged']} total={d['messages']}\")"
}

post_order() {
  curl -s -o /dev/null -w "%{http_code}" -X POST http://127.0.0.1:3001/orders \
    -H 'Content-Type: application/json' \
    -d '{"productId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","quantity":1}'
}

pub_invalid() {
  curl -s -u lab:lab 'http://127.0.0.1:15672/api/exchanges/%2F/amq.default/publish' \
    -H 'content-type: application/json' \
    -d '{"properties":{},"routing_key":"order.created.log","payload":"not-json","payload_encoding":"string"}'
}

kill_consumers() { pkill -9 -f "nest start event-consumer" 2>/dev/null || true; sleep 2; }

start_consumer() {
  nohup pnpm start:consumer:dev > /tmp/consumer-step2.log 2>&1 &
  echo $! > /tmp/consumer-step2.pid
  sleep 12
}

{
  echo "# Day 4 Step 2 lab run ($(date -Iseconds))"
  echo ""
  echo "## Exp 1–2: backlog and drain"
  kill_consumers
  echo "After kill consumers: $(qstats)"
  for _ in 1 2 3 4 5; do post_order; done
  sleep 1
  echo "After 5 orders (no consumer): $(qstats)"
  start_consumer
  echo "After consumer start: $(qstats)"
  echo 'Log tail:' 
  grep -E "order.created" /tmp/consumer-step2.log | tail -5 || true
  echo ""

  echo "## Exp 3: crash before ack"
  kill_consumers
  grep -q '^CONSUMER_PROCESSING_DELAY_MS=10000' .env || sed -i 's/^CONSUMER_PROCESSING_DELAY_MS=.*/CONSUMER_PROCESSING_DELAY_MS=10000/' .env
  start_consumer
  post_order; echo
  sleep 2
  echo "During delay: $(qstats)"
  kill -9 "$(cat /tmp/consumer-step2.pid)" 2>/dev/null || pkill -9 -f "nest start event-consumer" || true
  sleep 2
  start_consumer
  sleep 3
  echo "After crash restart: $(qstats)"
  grep redelivered /tmp/consumer-step2.log | tail -3 || echo "(no redelivered line yet)"
  sed -i 's/^CONSUMER_PROCESSING_DELAY_MS=.*/CONSUMER_PROCESSING_DELAY_MS=0/' .env
  echo ""

  echo "## Exp 4: nack without requeue"
  kill_consumers
  sed -i 's/^CONSUMER_INVALID_NACK_REQUEUE=.*/CONSUMER_INVALID_NACK_REQUEUE=false/' .env
  start_consumer
  pub_invalid; echo
  sleep 2
  echo "After invalid (no requeue): $(qstats)"
  grep -i nack /tmp/consumer-step2.log | tail -2 || true
  echo ""

  echo "## Exp 5: nack with requeue"
  sed -i 's/^CONSUMER_INVALID_NACK_REQUEUE=.*/CONSUMER_INVALID_NACK_REQUEUE=true/' .env
  kill_consumers
  start_consumer
  pub_invalid; echo
  sleep 2
  echo "After invalid (requeue): $(qstats)"
  sleep 2
  echo "2s later: $(qstats)"
  sed -i 's/^CONSUMER_INVALID_NACK_REQUEUE=.*/CONSUMER_INVALID_NACK_REQUEUE=false/' .env
  kill_consumers
  pub_invalid >/dev/null
  start_consumer
  sleep 2
  grep -i 'nacking with requeue' /tmp/consumer-step2.log | tail -1 || true
  echo ""

  echo "## Exp 6: broker restart"
  kill_consumers
  for _ in 1 2; do post_order; done
  sleep 1
  echo "Backlog before restart: $(qstats)"
  docker compose -f infrastructure/docker/compose.yaml restart rabbitmq
  sleep 8
  echo "After broker restart (no consumer): $(qstats)"
  start_consumer
  sleep 8
  echo "After consumer drain: $(qstats)"
  echo ""

  echo "## Exp 7: prefetch"
  kill_consumers
  sed -i 's/^RABBITMQ_CONSUMER_PREFETCH=.*/RABBITMQ_CONSUMER_PREFETCH=10/' .env
  sed -i 's/^CONSUMER_PROCESSING_DELAY_MS=.*/CONSUMER_PROCESSING_DELAY_MS=3000/' .env
  start_consumer
  grep prefetch /tmp/consumer-step2.log | tail -1
  for _ in 1 2 3 4 5 6 7 8; do post_order; done
  sleep 1
  echo "Prefetch 10 mid-flight: $(qstats)"
  sleep 5
  echo "Prefetch 10 after drain: $(qstats)"
  kill_consumers
  sed -i 's/^RABBITMQ_CONSUMER_PREFETCH=.*/RABBITMQ_CONSUMER_PREFETCH=1/' .env
  sed -i 's/^CONSUMER_PROCESSING_DELAY_MS=.*/CONSUMER_PROCESSING_DELAY_MS=0/' .env
  start_consumer
  for _ in 1 2 3 4 5; do post_order; done
  sleep 1
  echo "Prefetch 1 mid-flight: $(qstats)"
  sleep 5
  echo "Prefetch 1 after: $(qstats)"
} | tee "$REPORT"