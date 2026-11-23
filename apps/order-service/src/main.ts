import {
  AppEnvService,
  type OrderEnv,
} from '../../../libs/app-env/src/index.js';
import { setupHttp } from '../../../libs/http/src/index.js';
import { setupSwagger } from '../../../libs/swagger/src/index.js';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupHttp(app, { serviceName: 'OrderService' });
  setupSwagger(app, {
    title: 'Order Service',
    description: 'Creates orders and coordinates inventory reservations over HTTP.',
  });
  app.enableShutdownHooks();
  const appEnv = app.get(AppEnvService<OrderEnv>);
  await app.listen(appEnv.get('PORT'));
}
await bootstrap();
