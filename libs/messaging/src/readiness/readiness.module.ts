import {
  type DynamicModule,
  type FactoryProvider,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { RABBITMQ_READINESS_OPTIONS } from './readiness.constants.js';
import {
  RabbitMqReadinessService,
  type RabbitMqReadinessOptions,
} from './readiness.service.js';

type RabbitMqReadinessModuleAsyncOptions = {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider['inject'];
  useFactory: (
    ...args: never[]
  ) => Promise<RabbitMqReadinessOptions> | RabbitMqReadinessOptions;
};

@Module({})
export class RabbitMqReadinessModule {
  static forRootAsync(
    options: RabbitMqReadinessModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: RabbitMqReadinessModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: RABBITMQ_READINESS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        RabbitMqReadinessService,
      ],
    };
  }
}