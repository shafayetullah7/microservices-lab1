import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { setupHttp } from '../../../libs/http/src/index.js';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

describe('Order service (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupHttp(app, { serviceName: 'OrderService' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/health (GET) reports database status', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect((res) => {
        expect([200, 503]).toContain(res.status);
      });
  });
});
