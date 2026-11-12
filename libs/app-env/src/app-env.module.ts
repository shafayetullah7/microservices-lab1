import { DynamicModule, Global, Module } from '@nestjs/common';
import type { ZodType } from 'zod';
import { APP_ENV_TOKEN } from './app-env.constants.js';
import { AppEnvService } from './app-env.service.js';
import { parseEnv } from './parse-env.js';

@Global()
@Module({})
export class AppEnvModule {
  static forRoot<T extends ZodType>(schema: T): DynamicModule {
    return {
      module: AppEnvModule,
      providers: [
        {
          provide: APP_ENV_TOKEN,
          useFactory: () => parseEnv(schema, process.env),
        },
        AppEnvService,
      ],
      exports: [AppEnvService],
    };
  }
}
