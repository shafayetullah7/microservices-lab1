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
import { HealthModule } from '../../../libs/database-health/src/index.js';
import { DatabaseReadinessModule } from '../../../libs/database-readiness/src/index.js';
import { DatabaseModule } from './database/database.module.js';
import { relations } from './db/relations.js';
import { OrdersModule } from './orders/orders.module.js';

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
    DatabaseModule,
    OrdersModule,
  ],
})
export class AppModule {}
