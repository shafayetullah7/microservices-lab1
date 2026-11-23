import {
  type DynamicModule,
  type FactoryProvider,
  Global,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { OrderCreatedPublisher } from '../publishers/order-created.publisher.js';
import { RabbitMqConnectionService } from './connection.service.js';
import {
  RABBITMQ_MESSAGING_OPTIONS,
  type RabbitMqMessagingOptions,
} from './messaging.constants.js';

type RabbitMqMessagingModuleAsyncOptions = {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider['inject'];
  useFactory: (
    ...args: never[]
  ) => Promise<RabbitMqMessagingOptions> | RabbitMqMessagingOptions;
};

@Global()
@Module({})
export class RabbitMqMessagingModule {
  static forRootAsync(
    options: RabbitMqMessagingModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: RabbitMqMessagingModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: RABBITMQ_MESSAGING_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        RabbitMqConnectionService,
        OrderCreatedPublisher,
      ],
      exports: [OrderCreatedPublisher, RabbitMqConnectionService],
    };
  }
}