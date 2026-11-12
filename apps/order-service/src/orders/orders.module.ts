import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { InventoryClientModule } from '../inventory-client/inventory-client.module.js';
import { OrderRepository } from './order.repository.js';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

@Module({
  imports: [DatabaseModule, InventoryClientModule],
  controllers: [OrdersController],
  providers: [OrderRepository, OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
