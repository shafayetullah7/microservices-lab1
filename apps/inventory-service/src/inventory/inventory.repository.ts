import { Injectable } from '@nestjs/common';
import { and, eq, gte, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import * as schema from '../database/schema/index.js';

const { products, inventoryReservations } = schema;

export interface ReserveStockInput {
  orderId: string;
  productId: string;
  quantity: number;
}

export type ReservationResult =
  | { status: 'reserved'; reservationId: string }
  | { status: 'already_reserved'; reservationId: string }
  | { status: 'insufficient_stock' }
  | { status: 'conflict' };

@Injectable()
export class InventoryRepository {
  constructor(private readonly database: DatabaseService) {}

  async reserveStock(input: ReserveStockInput): Promise<ReservationResult> {
    return this.database.db.transaction(async (tx) => {
      await this.database.acquireOrderAdvisoryLock(tx, input.orderId);

      const [existing] = await tx
        .select()
        .from(inventoryReservations)
        .where(eq(inventoryReservations.orderId, input.orderId))
        .limit(1);

      if (existing) {
        if (
          existing.productId !== input.productId ||
          existing.quantity !== input.quantity ||
          existing.status !== 'reserved'
        ) {
          return { status: 'conflict' };
        }

        return {
          status: 'already_reserved',
          reservationId: existing.id,
        };
      }

      const [product] = await tx
        .update(products)
        .set({
          availableQuantity: sql`
            ${products.availableQuantity} - ${input.quantity}
          `,
        })
        .where(
          and(
            eq(products.id, input.productId),
            gte(products.availableQuantity, input.quantity),
          ),
        )
        .returning({ id: products.id });

      if (!product) {
        return { status: 'insufficient_stock' };
      }

      const [reservation] = await tx
        .insert(inventoryReservations)
        .values({
          orderId: input.orderId,
          productId: input.productId,
          quantity: input.quantity,
          status: 'reserved',
          idempotencyKey: input.orderId,
        })
        .returning({ id: inventoryReservations.id });

      return {
        status: 'reserved',
        reservationId: reservation.id,
      };
    });
  }
}
