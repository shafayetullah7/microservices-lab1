import {
  AppEnvService,
  type OrderEnv,
} from '../../../libs/app-env/src/index.js';
import { setupHttp } from '../../../libs/http/src/index.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupHttp(app);
  app.enableShutdownHooks();
  const appEnv = app.get(AppEnvService<OrderEnv>);
  await app.listen(appEnv.get('PORT'));
}
await bootstrap();
