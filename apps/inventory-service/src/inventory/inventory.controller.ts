import {
  Body,
  ConflictException,
  Controller,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { reserveStockSchema, type ReserveStockBody } from './dto/reserve-stock.schema.js';
import { InventoryService } from './inventory.service.js';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('reservations')
  async createReservation(
    @Body({ schema: reserveStockSchema }) body: ReserveStockBody,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.inventoryService.reserveStock(body);

    switch (result.status) {
      case 'reserved':
        res.status(201);
        return {
          status: result.status,
          reservationId: result.reservationId,
        };
      case 'already_reserved':
        res.status(200);
        return {
          status: result.status,
          reservationId: result.reservationId,
        };
      case 'insufficient_stock':
        throw new ConflictException({
          status: result.status,
          message: 'Insufficient stock',
        });
      case 'conflict':
        throw new ConflictException({
          status: result.status,
          message: 'Reservation conflict',
        });
    }
  }
}
