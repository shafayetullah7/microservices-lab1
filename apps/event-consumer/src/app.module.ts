import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  AppEnvModule,
  AppEnvService,
  consumerEnvSchema,
  type ConsumerEnv,
} from '../../../libs/app-env/src/index.js';
import {
  RabbitMqMessagingModule,
  RabbitMqReadinessModule,
} from '../../../libs/messaging/src/index.js';
import { OrderCreatedConsumer } from './order-created.consumer.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppEnvModule.forRoot(consumerEnvSchema),
    RabbitMqReadinessModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<ConsumerEnv>) => ({
        enabled: appEnv.get('RABBITMQ_ENABLED'),
        url: appEnv.get('RABBITMQ_URL'),
        label: 'RabbitMQ',
      }),
    }),
    RabbitMqMessagingModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<ConsumerEnv>) => ({
        enabled: appEnv.get('RABBITMQ_ENABLED'),
        url: appEnv.get('RABBITMQ_URL'),
        exchange: appEnv.get('ORDER_EVENTS_EXCHANGE'),
        routingKey: appEnv.get('ORDER_CREATED_ROUTING_KEY'),
        queue: appEnv.get('ORDER_CREATED_QUEUE'),
      }),
    }),
  ],
  providers: [OrderCreatedConsumer],
})
export class AppModule {}