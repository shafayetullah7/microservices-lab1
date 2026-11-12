import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import {
  AppEnvModule,
  AppEnvService,
  inventoryEnvSchema,
  type InventoryEnv,
} from '../../../libs/app-env/src/index.js';
import { drizzle } from 'drizzle-orm/node-postgres';
import { HealthModule } from '../../../libs/database-health/src/index.js';
import { DatabaseReadinessModule } from '../../../libs/database-readiness/src/index.js';
import { DatabaseModule } from './database/database.module.js';
import { relations } from './db/relations.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { InventoryServiceController } from './inventory-service.controller.js';
import { InventoryServiceService } from './inventory-service.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppEnvModule.forRoot(inventoryEnvSchema),
    DatabaseReadinessModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<InventoryEnv>) => ({
        connectionString: appEnv.get('INVENTORY_DATABASE_URL'),
        label: 'inventory database',
      }),
    }),
    DrizzleModule.forRootAsync({
      inject: [AppEnvService],
      useFactory: (appEnv: AppEnvService<InventoryEnv>) => ({
        drizzle,
        connection: {
          connectionString: appEnv.get('INVENTORY_DATABASE_URL'),
          max: 10,
          idleTimeoutMillis: 30_000,
        },
        relations,
      }),
    }),
    HealthModule,
    DatabaseModule,
    InventoryModule,
  ],
  controllers: [InventoryServiceController],
  providers: [InventoryServiceService],
})
export class InventoryServiceModule {}
