import { Body, Controller, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import {
  createReservationSchema,
  type CreateReservationDto,
} from './dto/create-reservation.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Post('reservations')
  async createReservation(
    @Body({ schema: createReservationSchema }) body: CreateReservationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.inventoryService.reserveStock(body);

    if (result.outcome === 'created') {
      res.status(201);
      return {
        status: 'reserved',
        reservationId: result.reservationId,
      };
    }

    res.status(200);
    return {
      status: 'already_reserved',
      reservationId: result.reservationId,
    };
  }
}
