import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq } from 'drizzle-orm';
import { setupHttp } from '../../../libs/http/src/index.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DatabaseService as InventoryDatabaseService } from '../../inventory-service/src/database/database.service.js';
import * as inventorySchema from '../../inventory-service/src/db/schema/index.js';
import { InventoryServiceModule } from '../../inventory-service/src/inventory-service.module.js';
import { AppModule } from '../src/app.module.js';
import { DatabaseService as OrderDatabaseService } from '../src/database/database.service.js';
import * as orderSchema from '../src/db/schema/index.js';

const { products, inventoryReservations } = inventorySchema;
const { orders } = orderSchema;

describe('Order ↔ Inventory integration (e2e)', () => {
  let inventoryApp: INestApplication<App>;
  let orderApp: INestApplication<App>;
  let inventoryUrl: string;
  let productId: string;
  const inventorySku = `order-integration-${Date.now()}`;

  beforeAll(async () => {
    const inventoryModule: TestingModule = await Test.createTestingModule({
      imports: [InventoryServiceModule],
    }).compile();
    inventoryApp = inventoryModule.createNestApplication();
    setupHttp(inventoryApp, { serviceName: 'InventoryService' });
    await inventoryApp.init();
    await inventoryApp.listen(0);
    inventoryUrl = await inventoryApp.getUrl();

    process.env.INVENTORY_SERVICE_URL = inventoryUrl;

    const orderModule: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    orderApp = orderModule.createNestApplication();
    setupHttp(orderApp, { serviceName: 'OrderService' });
    await orderApp.init();

    const inventoryDb = inventoryApp.get(InventoryDatabaseService);
    const [product] = await inventoryDb.db
      .insert(products)
      .values({
        sku: inventorySku,
        name: 'Integration product',
        availableQuantity: 10,
      })
      .returning({ id: products.id });
    productId = product.id;
  });

  afterAll(async () => {
    const inventoryDb = inventoryApp.get(InventoryDatabaseService);
    await inventoryDb.db
      .delete(inventoryReservations)
      .where(eq(inventoryReservations.productId, productId));
    await inventoryDb.db.delete(products).where(eq(products.id, productId));
    await orderApp.close();
    await inventoryApp.close();
  });

  it('creates a RESERVED order and decrements inventory stock', async () => {
    const created = await request(orderApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 3 })
      .expect(201);

    expect(created.body).toMatchObject({
      status: 'RESERVED',
      productId,
      quantity: 3,
      reservationId: expect.any(String),
    });

    const [product] = await inventoryApp
      .get(InventoryDatabaseService)
      .db.select()
      .from(products)
      .where(eq(products.id, productId));
    expect(product?.availableQuantity).toBe(7);

    const fetched = await request(orderApp.getHttpServer())
      .get(`/orders/${created.body.id}`)
      .expect(200);
    expect(fetched.body.status).toBe('RESERVED');
  });

  it('rejects an order when stock is insufficient', async () => {
    const created = await request(orderApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 100 })
      .expect(201);

    expect(created.body.status).toBe('REJECTED');
    expect(created.body).not.toHaveProperty('reservationId');
  });

  it('leaves order PENDING when inventory is unavailable', async () => {
    process.env.INVENTORY_SERVICE_URL = 'http://127.0.0.1:1';

    const isolatedModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const isolatedApp = isolatedModule.createNestApplication();
    setupHttp(isolatedApp, { serviceName: 'OrderService' });
    await isolatedApp.init();

    const created = await request(isolatedApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 1 })
      .expect(201);

    expect(created.body.status).toBe('PENDING');

    const [row] = await isolatedApp
      .get(OrderDatabaseService)
      .db.select()
      .from(orders)
      .where(eq(orders.id, created.body.id));
    expect(row?.status).toBe('PENDING');

    await isolatedApp.close();
    process.env.INVENTORY_SERVICE_URL = inventoryUrl;
  });

  it('does not double-decrement stock on duplicate reservation for the same order', async () => {
    const created = await request(orderApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 2 })
      .expect(201);

    expect(created.body.status).toBe('RESERVED');

    const inventoryDb = inventoryApp.get(InventoryDatabaseService);
    const stockAfterFirst = (
      await inventoryDb.db
        .select()
        .from(products)
        .where(eq(products.id, productId))
    )[0]?.availableQuantity;

    await request(inventoryApp.getHttpServer())
      .post('/reservations')
      .send({
        orderId: created.body.id,
        productId,
        quantity: 2,
      })
      .expect(200);

    const stockAfterRetry = (
      await inventoryDb.db
        .select()
        .from(products)
        .where(eq(products.id, productId))
    )[0]?.availableQuantity;

    expect(stockAfterRetry).toBe(stockAfterFirst);
  });

  it('reconciles PENDING order after inventory becomes available', async () => {
    process.env.INVENTORY_SERVICE_URL = 'http://127.0.0.1:1';

    const isolatedModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const isolatedApp = isolatedModule.createNestApplication();
    setupHttp(isolatedApp, { serviceName: 'OrderService' });
    await isolatedApp.init();

    const created = await request(isolatedApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 1 })
      .expect(201);

    expect(created.body.status).toBe('PENDING');
    await isolatedApp.close();

    process.env.INVENTORY_SERVICE_URL = inventoryUrl;

    const reconcileModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const reconcileApp = reconcileModule.createNestApplication();
    setupHttp(reconcileApp, { serviceName: 'OrderService' });
    await reconcileApp.init();

    const reconciled = await request(reconcileApp.getHttpServer())
      .post(`/orders/${created.body.id}/reconcile`)
      .expect(201);

    expect(reconciled.body.status).toBe('RESERVED');
    expect(reconciled.body.reservationId).toEqual(expect.any(String));

    await reconcileApp.close();
  });

  it('leaves order PENDING when inventory commits but HTTP response is lost to timeout', async () => {
    const savedProcessingDelay = process.env.RESERVATION_PROCESSING_DELAY_MS;
    const savedResponseDelay = process.env.RESERVATION_RESPONSE_DELAY_MS;
    const savedOrderTimeout = process.env.INVENTORY_HTTP_TIMEOUT_MS;

    process.env.RESERVATION_PROCESSING_DELAY_MS = '0';
    process.env.RESERVATION_RESPONSE_DELAY_MS = '2000';
    process.env.INVENTORY_HTTP_TIMEOUT_MS = '500';

    const delayedInventoryModule = await Test.createTestingModule({
      imports: [InventoryServiceModule],
    }).compile();
    const delayedInventoryApp = delayedInventoryModule.createNestApplication();
    setupHttp(delayedInventoryApp, { serviceName: 'InventoryService' });
    await delayedInventoryApp.init();
    await delayedInventoryApp.listen(0);
    const delayedInventoryUrl = await delayedInventoryApp.getUrl();

    process.env.INVENTORY_SERVICE_URL = delayedInventoryUrl;

    const slowClientModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    const slowClientApp = slowClientModule.createNestApplication();
    setupHttp(slowClientApp, { serviceName: 'OrderService' });
    await slowClientApp.init();

    const created = await request(slowClientApp.getHttpServer())
      .post('/orders')
      .send({ productId, quantity: 1 })
      .expect(201);

    expect(created.body.status).toBe('PENDING');

    const [reservation] = await delayedInventoryApp
      .get(InventoryDatabaseService)
      .db.select()
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, created.body.id));

    expect(reservation).toBeDefined();

    const reconciled = await request(orderApp.getHttpServer())
      .post(`/orders/${created.body.id}/reconcile`)
      .expect(201);

    expect(reconciled.body.status).toBe('RESERVED');

    await slowClientApp.close();
    await delayedInventoryApp.close();

    process.env.RESERVATION_PROCESSING_DELAY_MS = savedProcessingDelay;
    process.env.RESERVATION_RESPONSE_DELAY_MS = savedResponseDelay;
    process.env.INVENTORY_HTTP_TIMEOUT_MS = savedOrderTimeout;
    process.env.INVENTORY_SERVICE_URL = inventoryUrl;
  }, 30_000);
});
