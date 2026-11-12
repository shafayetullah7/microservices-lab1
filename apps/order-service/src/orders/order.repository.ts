import { Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service.js';
import * as schema from '../database/schema/index.js';

const { orders, orderItems } = schema;

export type OrderStatus = 'PENDING' | 'RESERVED' | 'REJECTED';

export type CreateOrderRecord = {
  productId: string;
  quantity: number;
};

export type OrderWithLine = {
  id: string;
  status: OrderStatus;
  productId: string;
  quantity: number;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class OrderRepository {
  constructor(private readonly database: DatabaseService) {}

  async createOrder(input: CreateOrderRecord): Promise<OrderWithLine> {
    return this.database.db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({ status: 'PENDING' })
        .returning();

      const [item] = await tx
        .insert(orderItems)
        .values({
          orderId: order.id,
          productId: input.productId,
          quantity: input.quantity,
          unitPriceMinor: 0n,
          currency: 'USD',
        })
        .returning();

      return {
        id: order.id,
        status: order.status as OrderStatus,
        productId: item.productId,
        quantity: item.quantity,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });
  }

  async updateStatus(orderId: string, status: OrderStatus): Promise<void> {
    await this.database.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, orderId));
  }

  async findById(orderId: string): Promise<OrderWithLine | null> {
    const rows = await this.database.db
      .select({
        id: orders.id,
        status: orders.status,
        productId: orderItems.productId,
        quantity: orderItems.quantity,
        createdAt: orders.createdAt,
        updatedAt: orders.updatedAt,
      })
      .from(orders)
      .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(eq(orders.id, orderId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return null;
    }

    return {
      id: row.id,
      status: row.status as OrderStatus,
      productId: row.productId,
      quantity: row.quantity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
