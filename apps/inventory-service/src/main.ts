import {
  AppEnvService,
  type InventoryEnv,
} from '../../../libs/app-env/src/index.js';
import { setupHttp } from '../../../libs/http/src/index.js';
import { setupSwagger } from '../../../libs/swagger/src/index.js';
import { NestFactory } from '@nestjs/core';
import { InventoryServiceModule } from './inventory-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(InventoryServiceModule);
  setupHttp(app, { serviceName: 'InventoryService' });
  setupSwagger(app, {
    title: 'Inventory Service',
    description: 'Transactional stock reservations for the microservices lab.',
  });
  app.enableShutdownHooks();
  const appEnv = app.get(AppEnvService<InventoryEnv>);
  await app.listen(appEnv.get('PORT'));
}
await bootstrap();
