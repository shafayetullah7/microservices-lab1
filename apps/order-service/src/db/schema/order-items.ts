import { sql } from 'drizzle-orm';
import { bigint, char, check, index, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import { orders } from './orders.js';

export const orderItems = pgTable(
  'order_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id),
    productId: uuid('product_id').notNull(),
    quantity: integer('quantity').notNull(),
    unitPriceMinor: bigint('unit_price_minor', { mode: 'bigint' }).notNull(),
    currency: char('currency', { length: 3 }).notNull(),
  },
  (table) => [
    check('order_items_quantity_check', sql`${table.quantity} > 0`),
    check(
      'order_items_unit_price_minor_check',
      sql`${table.unitPriceMinor} >= 0`,
    ),
    index('order_items_order_id_idx').on(table.orderId),
  ],
);

export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
