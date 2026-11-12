import { ConflictException, Injectable } from '@nestjs/common';
import type { CreateReservationDto } from './dto/create-reservation.dto.js';
import { InventoryRepository } from './inventory.repository.js';

export type ReservationResponse =
  | { outcome: 'created'; reservationId: string }
  | { outcome: 'existing'; reservationId: string };

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async reserveStock(dto: CreateReservationDto): Promise<ReservationResponse> {
    const result = await this.inventoryRepository.reserveStock(dto);

    switch (result.status) {
      case 'reserved':
        return {
          outcome: 'created',
          reservationId: result.reservationId,
        };
      case 'already_reserved':
        return {
          outcome: 'existing',
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
          message:
            'Reservation conflict: this orderId is already tied to a different reservation',
        });
    }
  }
}
