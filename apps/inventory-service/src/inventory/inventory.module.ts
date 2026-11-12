import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { InventoryRepository } from './inventory.repository.js';

@Module({
  imports: [DatabaseModule],
  providers: [InventoryRepository],
  exports: [InventoryRepository],
})
export class InventoryModule {}
