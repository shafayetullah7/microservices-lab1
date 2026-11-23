import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PG_INTEGER_MAX, setupHttp } from '../../../libs/http/src/index.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  InventoryHttpClient,
  type InventoryReservationOutcome,
} from '../src/inventory-client/inventory-http.client.js';
import { AppModule } from '../src/app.module.js';

describe('POST /orders (e2e)', () => {
  let app: INestApplication<App>;
  let inventoryOutcome: InventoryReservationOutcome;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(InventoryHttpClient)
      .useValue({
        reserveStock: async () => inventoryOutcome,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    setupHttp(app, { serviceName: 'OrderService' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns RESERVED when inventory reserves stock', async () => {
    inventoryOutcome = {
      kind: 'reserved',
      reservationId: '11111111-1111-4111-8111-111111111111',
    };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 3,
      })
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'RESERVED',
      reservationId: inventoryOutcome.reservationId,
    });
  });

  it('returns REJECTED when inventory reports insufficient stock', async () => {
    inventoryOutcome = { kind: 'insufficient_stock' };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 3,
      })
      .expect(201);

    expect(response.body.status).toBe('REJECTED');
  });

  it('returns PENDING when inventory is unavailable', async () => {
    inventoryOutcome = { kind: 'unavailable' };

    const response = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    expect(response.body.status).toBe('PENDING');
  });

  it('lists orders including one that was created', async () => {
    inventoryOutcome = {
      kind: 'reserved',
      reservationId: '44444444-4444-4444-8444-444444444444',
    };

    const created = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    const list = await request(app.getHttpServer()).get('/orders').expect(200);

    expect(list.body).toMatchObject({
      data: expect.any(Array),
      pagination: {
        page: 1,
        pageSize: 20,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
        hasNextPage: expect.any(Boolean),
        hasPreviousPage: false,
      },
    });
    expect(
      list.body.data.some(
        (order: { id: string }) => order.id === created.body.id,
      ),
    ).toBe(true);
  });

  it('returns orders sorted by createdAt descending', async () => {
    inventoryOutcome = {
      kind: 'reserved',
      reservationId: '66666666-6666-4666-8666-666666666666',
    };

    const older = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    await new Promise((resolve) => setTimeout(resolve, 20));

    const newer = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/orders?pageSize=100&sortBy=createdAt&sortOrder=desc')
      .expect(200);

    const ids = list.body.data.map((order: { id: string }) => order.id);
    expect(ids.indexOf(newer.body.id)).toBeLessThan(ids.indexOf(older.body.id));
  });

  it('paginates orders with page and pageSize', async () => {
    inventoryOutcome = {
      kind: 'reserved',
      reservationId: '55555555-5555-4555-8555-555555555555',
    };

    await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    const page = await request(app.getHttpServer())
      .get('/orders?page=1&pageSize=1')
      .expect(200);

    expect(page.body.pagination).toMatchObject({
      page: 1,
      pageSize: 1,
      hasPreviousPage: false,
    });
    expect(page.body.data).toHaveLength(1);
  });

  it('rejects invalid pagination query', async () => {
    await request(app.getHttpServer()).get('/orders?page=0').expect(400);
    await request(app.getHttpServer()).get('/orders?pageSize=200').expect(400);
  });

  it('validates request body', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'bad-id', quantity: -2 })
      .expect(400);
  });

  it('rejects quantity above PostgreSQL integer range', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: PG_INTEGER_MAX + 1,
      })
      .expect(400);
  });

  it('reconciles a PENDING order when inventory reports already_reserved', async () => {
    inventoryOutcome = { kind: 'unavailable' };

    const created = await request(app.getHttpServer())
      .post('/orders')
      .send({
        productId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        quantity: 1,
      })
      .expect(201);

    expect(created.body.status).toBe('PENDING');

    inventoryOutcome = {
      kind: 'already_reserved',
      reservationId: '33333333-3333-4333-8333-333333333333',
    };

    const reconciled = await request(app.getHttpServer())
      .post(`/orders/${created.body.id}/reconcile`)
      .expect(201);

    expect(reconciled.body).toMatchObject({
      status: 'RESERVED',
      reservationId: '33333333-3333-4333-8333-333333333333',
    });
  });
});
