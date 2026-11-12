import { sql } from 'drizzle-orm';
import { check, index, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    status: varchar('status', { length: 32 }).notNull().default('PENDING'),
    customerId: uuid('customer_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    check(
      'orders_status_check',
      sql`${table.status} in ('PENDING', 'RESERVED', 'REJECTED')`,
    ),
    index('orders_status_created_at_idx').on(table.status, table.createdAt),
  ],
);

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
