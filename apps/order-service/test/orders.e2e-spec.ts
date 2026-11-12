import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { setupHttp } from '../../../libs/http/src/index.js';
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
    setupHttp(app);
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

  it('validates request body', async () => {
    await request(app.getHttpServer())
      .post('/orders')
      .send({ productId: 'bad-id', quantity: -2 })
      .expect(400);
  });
});
