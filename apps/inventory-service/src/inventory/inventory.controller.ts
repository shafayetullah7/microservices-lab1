import { Body, Controller, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import {
  AppEnvService,
  type InventoryEnv,
} from '../../../../libs/app-env/src/index.js';
import {
  createReservationSchema,
  type CreateReservationDto,
} from './dto/create-reservation.dto.js';
import {
  reservationConflictSchema,
  reservationSuccessSchema,
} from './dto/reservation-response.schema.js';
import { InventoryService } from './inventory.service.js';
import { httpErrorSchema } from '../../../../libs/http/src/index.js';
import { sleep } from './utils/sleep.js';

@ApiTags('inventory')
@Controller()
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly appEnv: AppEnvService<InventoryEnv>,
  ) {}

  @Post('reservations')
  @ApiOperation({
    summary: 'Reserve stock for an order',
    description:
      'Returns 201 for a new reservation or 200 when the same orderId was already reserved with identical details.',
  })
  @ApiCreatedResponse({
    description: 'New reservation created',
    standardSchema: reservationSuccessSchema,
  })
  @ApiOkResponse({
    description: 'Existing reservation (idempotent retry)',
    standardSchema: reservationSuccessSchema,
  })
  @ApiBadRequestResponse({
    description: 'Invalid request body',
    standardSchema: httpErrorSchema,
  })
  @ApiConflictResponse({
    description: 'Insufficient stock or incompatible existing reservation',
    standardSchema: reservationConflictSchema,
  })
  @ApiServiceUnavailableResponse({
    description: 'Inventory database unavailable',
    standardSchema: httpErrorSchema,
  })
  async createReservation(
    @Body({ schema: createReservationSchema }) body: CreateReservationDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const processingDelayMs = this.appEnv.get('RESERVATION_PROCESSING_DELAY_MS');
    if (processingDelayMs > 0 && process.env.NODE_ENV === 'production') {
      throw new Error('RESERVATION_PROCESSING_DELAY_MS is not allowed in production');
    }
    await sleep(processingDelayMs);

    const result = await this.inventoryService.reserveStock(body);

    const responseDelayMs = this.appEnv.get('RESERVATION_RESPONSE_DELAY_MS');
    if (responseDelayMs > 0 && process.env.NODE_ENV === 'production') {
      throw new Error('RESERVATION_RESPONSE_DELAY_MS is not allowed in production');
    }
    await sleep(responseDelayMs);

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