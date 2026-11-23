import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { eq, sql } from 'drizzle-orm';
import { setupHttp } from '../../../libs/http/src/index.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { DatabaseService } from '../src/database/database.service.js';
import * as schema from '../src/db/schema/index.js';
import { InventoryServiceModule } from '../src/inventory-service.module.js';

const { products, inventoryReservations } = schema;

describe('POST /reservations (e2e)', () => {
  let app: INestApplication<App>;
  let productId: string;
  const testSku = `e2e-${Date.now()}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [InventoryServiceModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupHttp(app, { serviceName: 'InventoryService' });
    await app.init();

    const database = app.get(DatabaseService);
    const [product] = await database.db
      .insert(products)
      .values({
        sku: testSku,
        name: 'E2E product',
        availableQuantity: 10,
      })
      .returning({ id: products.id });

    productId = product.id;
  });

  afterAll(async () => {
    const database = app.get(DatabaseService);
    await database.db
      .delete(inventoryReservations)
      .where(eq(inventoryReservations.productId, productId));
    await database.db.delete(products).where(eq(products.id, productId));
    await app.close();
  });

  it('reserves units and decrements stock', async () => {
    const orderId = crypto.randomUUID();

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 3 })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'reserved',
      reservationId: expect.any(String),
    });

    const [product] = await app
      .get(DatabaseService)
      .db.select()
      .from(products)
      .where(eq(products.id, productId));

    expect(product?.availableQuantity).toBe(7);
  });

  it('repeating the same request is idempotent and leaves stock unchanged', async () => {
    const orderId = crypto.randomUUID();

    await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 3 })
      .expect(201);

    const repeat = await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 3 })
      .expect(200);

    expect(repeat.body).toMatchObject({
      status: 'already_reserved',
      reservationId: expect.any(String),
    });

    const [product] = await app
      .get(DatabaseService)
      .db.select()
      .from(products)
      .where(eq(products.id, productId));

    expect(product?.availableQuantity).toBe(4);
  });

  it('returns 409 when reusing orderId with different quantity', async () => {
    const orderId = crypto.randomUUID();

    await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 1 })
      .expect(201);

    const conflict = await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 2 })
      .expect(409);

    expect(conflict.body).toMatchObject({
      status: 'conflict',
    });
  });

  it('returns 409 when stock is insufficient', async () => {
    const orderId = crypto.randomUUID();

    const response = await request(app.getHttpServer())
      .post('/reservations')
      .send({ orderId, productId, quantity: 20 })
      .expect(409);

    expect(response.body).toMatchObject({
      status: 'insufficient_stock',
      message: 'Insufficient stock',
    });
  });

  it('returns 400 for invalid UUID or negative quantity', async () => {
    await request(app.getHttpServer())
      .post('/reservations')
      .send({
        orderId: 'not-a-uuid',
        productId,
        quantity: 1,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/reservations')
      .send({
        orderId: crypto.randomUUID(),
        productId,
        quantity: -1,
      })
      .expect(400);
  });

  it('creates only one reservation under concurrent requests for the same order', async () => {
    const orderId = crypto.randomUUID();
    const payload = { orderId, productId, quantity: 1 };

    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        request(app.getHttpServer()).post('/reservations').send(payload),
      ),
    );

    const statuses = responses.map((r) => r.status).sort();
    expect(statuses.filter((s) => s === 201)).toHaveLength(1);
    expect(statuses.filter((s) => s === 200)).toHaveLength(7);

    const reservationIds = new Set(
      responses.map((r) => r.body.reservationId as string),
    );
    expect(reservationIds.size).toBe(1);

    const [count] = await app
      .get(DatabaseService)
      .db.select({ total: sql<number>`count(*)::int` })
      .from(inventoryReservations)
      .where(eq(inventoryReservations.orderId, orderId));

    expect(count?.total).toBe(1);
  });
});
