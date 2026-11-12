import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import {
  AppEnvModule,
  AppEnvService,
  orderEnvSchema,
  type OrderEnv,
} from '../../../libs/app-env/src/index.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthModule } from '../../../libs/database-health/src/index.js';
import { DatabaseReadinessModule } from '../../../libs/database-readiness/src/index.js';
import { relations } from './db/relations.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppEnvModule.forRoot(orderEnvSchema),
    DatabaseReadinessModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<OrderEnv>) => ({
        connectionString: appEnv.get('ORDER_DATABASE_URL'),
        label: 'order database',
      }),
    }),
    DrizzleModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<OrderEnv>) => ({
        drizzle,
        connection: {
          connectionString: appEnv.get('ORDER_DATABASE_URL'),
          max: 10,
          idleTimeoutMillis: 30_000,
        },
        relations,
      }),
    }),
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
