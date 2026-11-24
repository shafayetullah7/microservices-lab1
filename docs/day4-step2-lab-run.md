# Day 4 Step 2 lab run (2026-11-24T17:44:14+06:00)

## Exp 1–2: backlog and drain
After kill consumers: consumers=1 ready=0 unacked=0 total=0
201201201201201After 5 orders (no consumer): consumers=1 ready=0 unacked=0 total=0
After consumer start: consumers=2 ready=0 unacked=0 total=0
Log tail:
[Nest] 232184  - 11/24/2026, 5:44:18 PM     LOG [OrderCreatedConsumer] Consuming order.created.log (order.created events, prefetch=1)

## Exp 3: crash before ack
201
During delay: consumers=3 ready=0 unacked=0 total=0
After crash restart: consumers=3 ready=0 unacked=0 total=0
(no redelivered line yet)

## Exp 4: nack without requeue
{"routed":true}
After invalid (no requeue): consumers=4 ready=0 unacked=0 total=0
[Nest] 232184  - 11/24/2026, 5:45:16 PM   ERROR [OrderCreatedConsumer] Invalid message; nacking without requeue: Unexpected token 'o', "not-json" is not valid JSON

## Exp 5: nack with requeue
{"routed":true}
After invalid (requeue): consumers=5 ready=0 unacked=0 total=0
2s later: consumers=5 ready=0 unacked=0 total=0

## Exp 6: broker restart
201201Backlog before restart: consumers=6 ready=0 unacked=0 total=0
After broker restart (no consumer): consumers=0 ready=0 unacked=0 total=0
After consumer drain: consumers=1 ready=0 unacked=0 total=0

## Exp 7: prefetch
[Nest] 236706  - 11/24/2026, 5:46:33 PM     LOG [OrderCreatedConsumer] Consuming order.created.log (order.created events, prefetch=10)
201201201201201201201201Prefetch 10 mid-flight: consumers=2 ready=0 unacked=0 total=0
