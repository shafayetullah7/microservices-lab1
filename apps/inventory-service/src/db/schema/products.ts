import { sql } from 'drizzle-orm';
import { check, integer, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';

export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sku: varchar('sku', { length: 80 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    availableQuantity: integer('available_quantity').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    unique('products_sku_unique').on(table.sku),
    check(
      'products_available_quantity_check',
      sql`${table.availableQuantity} >= 0`,
    ),
  ],
);

export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
