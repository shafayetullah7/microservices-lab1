import {
  AppEnvService,
  type InventoryEnv,
} from '../../../libs/app-env/src/index.js';
import { NestFactory } from '@nestjs/core';
import { InventoryServiceModule } from './inventory-service.module.js';

async function bootstrap() {
  const app = await NestFactory.create(InventoryServiceModule);
  const appEnv = app.get(AppEnvService<InventoryEnv>);
  await app.listen(appEnv.get('PORT'));
}
await bootstrap();
