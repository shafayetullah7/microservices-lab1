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
import { relations } from './db/relations.js';
import { InventoryServiceController } from './inventory-service.controller.js';
import { InventoryServiceService } from './inventory-service.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AppEnvModule.forRoot(inventoryEnvSchema),
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
  ],
  controllers: [InventoryServiceController],
  providers: [InventoryServiceService],
})
export class InventoryServiceModule {}
