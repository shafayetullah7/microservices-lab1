import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { products } from './products.js';

export const inventoryReservations = pgTable(
  'inventory_reservations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id').notNull(),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    status: varchar('status', { length: 24 }).notNull(),
    idempotencyKey: varchar('idempotency_key', { length: 160 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check('inventory_reservations_quantity_check', sql`${table.quantity} > 0`),
    check(
      'inventory_reservations_status_check',
      sql`${table.status} in ('reserved', 'released', 'committed')`,
    ),
    unique('inventory_reservations_idempotency_key_unique').on(
      table.idempotencyKey,
    ),
    index('inventory_reservations_order_id_idx').on(table.orderId),
    index('inventory_reservations_product_id_status_idx').on(
      table.productId,
      table.status,
    ),
  ],
);

export type InventoryReservation = typeof inventoryReservations.$inferSelect;
export type NewInventoryReservation = typeof inventoryReservations.$inferInsert;
