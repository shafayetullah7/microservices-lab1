import { sql } from 'drizzle-orm';
import { index, integer, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    aggregateId: uuid('aggregate_id').notNull(),
    eventType: varchar('event_type', { length: 120 }).notNull(),
    eventVersion: integer('event_version').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    attemptCount: integer('attempt_count').notNull().default(0),
  },
  (table) => [
    index('outbox_events_published_at_created_at_idx').on(
      table.publishedAt,
      table.createdAt,
    ),
  ],
);

export type OutboxEvent = typeof outboxEvents.$inferSelect;
export type NewOutboxEvent = typeof outboxEvents.$inferInsert;
