import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { InventoryHttpClient } from './inventory-http.client.js';

@Module({
  imports: [HttpModule],
  providers: [InventoryHttpClient],
  exports: [InventoryHttpClient],
})
export class InventoryClientModule {}
