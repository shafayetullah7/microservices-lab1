import {
  type DynamicModule,
  type FactoryProvider,
  Module,
  type ModuleMetadata,
} from '@nestjs/common';
import { DATABASE_READINESS_OPTIONS } from './database-readiness.constants.js';
import {
  DatabaseReadinessService,
  type DatabaseReadinessOptions,
} from './database-readiness.service.js';

type DatabaseReadinessModuleAsyncOptions = {
  imports?: ModuleMetadata['imports'];
  inject?: FactoryProvider['inject'];
  useFactory: (
    ...args: never[]
  ) => Promise<DatabaseReadinessOptions> | DatabaseReadinessOptions;
};

@Module({})
export class DatabaseReadinessModule {
  static forRootAsync(
    options: DatabaseReadinessModuleAsyncOptions,
  ): DynamicModule {
    return {
      module: DatabaseReadinessModule,
      imports: options.imports ?? [],
      providers: [
        {
          provide: DATABASE_READINESS_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        DatabaseReadinessService,
      ],
    };
  }
}
