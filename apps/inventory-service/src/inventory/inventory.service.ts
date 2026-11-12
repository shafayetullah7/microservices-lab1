import { Injectable } from '@nestjs/common';
import type { ReserveStockBody } from './dto/reserve-stock.schema.js';
import {
  InventoryRepository,
  type ReservationResult,
} from './inventory.repository.js';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  reserveStock(input: ReserveStockBody): Promise<ReservationResult> {
    return this.inventoryRepository.reserveStock(input);
  }
}
