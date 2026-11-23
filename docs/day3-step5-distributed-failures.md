# Day 3 — Step 5: Distributed Failure Experiments

## Prerequisites

1. `pnpm db:up`
2. `pnpm db:order:migrate` and `pnpm db:inventory:migrate`
3. Seed a product in inventory (10 units):

```bash
psql "$INVENTORY_DATABASE_URL" -c "
  INSERT INTO products (sku, name, available_quantity)
  VALUES ('LAB-SKU-1', 'Lab product', 10)
  ON CONFLICT (sku) DO UPDATE SET available_quantity = 10
  RETURNING id;
"
```

4. Root `.env` (see [`.env.example`](../.env.example)): `INVENTORY_SERVICE_URL`, `INVENTORY_HTTP_TIMEOUT_MS=3000`, delay vars at `0` unless experimenting.
5. Two terminals: `pnpm start:inventory` (3000), `pnpm start:order` (3001).

Record `PRODUCT_ID` from the seed step.

---

## Guarantees matrix (current implementation)

| Guarantee | Provided? | Mechanism |
|-----------|-----------|-----------|
| Stock never negative | Yes | Conditional `UPDATE` + `CHECK (available_quantity >= 0)` |
| Reservation and stock decrement atomic | Yes | Single PostgreSQL transaction in `InventoryRepository.reserveStock` |
| Same `orderId` + same details → no double decrement | Yes | Idempotent reservation row + `already_reserved` |
| Same `orderId` + different details | Conflict (409) | Repository compares product/quantity/status |
| Order service knows inventory succeeded | Only after HTTP 201/200 | `OrdersService` updates status from client outcome |
| HTTP client timeout ⇒ inventory did not run | **No** | Lost response after commit (experiment 3) |

**Key lesson:** An HTTP timeout means the **caller** did not get a timely response—not that the callee did not execute work.

---

## Experiment playbook

Replace `PRODUCT_ID`, `ORDER_ID`, and ports as needed.

### 1. Service outage

**Setup:** Stop inventory (`Ctrl+C`) or set `INVENTORY_SERVICE_URL=http://127.0.0.1:1` and restart order service.

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://127.0.0.1:3001/orders \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}"
```

**Expected:** JSON `status: "PENDING"`. No row in `inventory_reservations` for that order id.

### 2. Request timeout (slow processing)

**Setup:** In `.env` for inventory: `RESERVATION_PROCESSING_DELAY_MS=5000`, order: `INVENTORY_HTTP_TIMEOUT_MS=3000`. Restart inventory.

**Expected:** Order stays **PENDING** (timeout before `reserveStock` completes). No reservation if delay is entirely before DB work completes; stock unchanged.

Reset delays to `0` after the run.

### 3. Lost response (commit before timeout)

**Setup:** `RESERVATION_PROCESSING_DELAY_MS=0`, `RESERVATION_RESPONSE_DELAY_MS=5000`, order timeout `3000`. Restart inventory.

```bash
curl -s -X POST http://127.0.0.1:3001/orders \
  -H 'Content-Type: application/json' \
  -d "{\"productId\":\"$PRODUCT_ID\",\"quantity\":1}"
```

**Expected:** Order **PENDING** in order DB. In inventory DB: reservation exists for `orderId`, stock decremented.

```bash
# orderId from response body
curl -s http://127.0.0.1:3001/orders/$ORDER_ID
psql "$INVENTORY_DATABASE_URL" -c \
  "SELECT order_id, quantity, status FROM inventory_reservations WHERE order_id='$ORDER_ID';"
```

### 4. Duplicate requests

Repeat the same reservation (inventory API):

```bash
curl -s -w "\nHTTP %{http_code}\n" -X POST http://127.0.0.1:3000/reservations \
  -H 'Content-Type: application/json' \
  -d "{\"orderId\":\"$ORDER_ID\",\"productId\":\"$PRODUCT_ID\",\"quantity\":1}"
```

**Expected:** First call 201, second **200** `already_reserved`; `available_quantity` unchanged on second call.

### 5. Recovery (reconcile)

After experiment 3:

```bash
curl -s -X POST http://127.0.0.1:3001/orders/$ORDER_ID/reconcile
```

**Expected:** `status: "RESERVED"`, `reservationId` present; stock still reflects a single decrement. Reconcile calls inventory with the same `orderId`; inventory returns `already_reserved` safely.

### 6. Document findings

Update the [Recorded findings](#recorded-findings) section below after each manual run.

---

## Recovery narrative

- Orders stuck in **PENDING** may already have inventory reserved (lost response).
- **`POST /orders/:id/reconcile`** re-invokes `POST /reservations` with the stored line item and uses `orderId` = order primary key.
- Inventory idempotency ensures reconcile does not double-charge stock.

Production systems would add background reconciliation, outbox/events, or message queues (Day 4).

---

## Recorded findings

_Fill in when you run the manual checklist locally._

| # | Scenario | Observed order status | Observed stock / reservations | Notes |
|---|----------|----------------------|-------------------------------|-------|
| 1 | Service outage | PENDING | No reservation | Verified via `orders.integration.e2e-spec` (unavailable inventory URL) |
| 2 | Processing delay > timeout | PENDING (expected) | | Set `RESERVATION_PROCESSING_DELAY_MS=5000`, timeout 3000 |
| 3 | Response delay > timeout | PENDING | Reservation present, stock −qty | Demonstrates timeout ≠ failure; covered by integration e2e (`lost response`) |
| 4 | Duplicate reservation | 200 already_reserved | Stock unchanged | Covered by integration + inventory e2e |
| 5 | Reconcile after PENDING | RESERVED | Stock unchanged | `POST /orders/:id/reconcile` + integration e2e |

**Automated verification (CI / local):** `pnpm test` and `pnpm test:e2e` cover outage (PENDING), reconcile → RESERVED, and duplicate reservation idempotency.

---

## Lab-only env vars

| Variable | Service | Purpose |
|----------|---------|---------|
| `RESERVATION_PROCESSING_DELAY_MS` | Inventory | Delay before `reserveStock` |
| `RESERVATION_RESPONSE_DELAY_MS` | Inventory | Delay after success before HTTP response |
| `INVENTORY_HTTP_TIMEOUT_MS` | Order | Client timeout for inventory HTTP |

Delays are rejected at runtime if `NODE_ENV=production`.