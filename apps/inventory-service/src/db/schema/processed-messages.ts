import { sql } from 'drizzle-orm';
import { pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const processedMessages = pgTable(
  'processed_messages',
  {
    consumerName: varchar('consumer_name', { length: 100 }).notNull(),
    messageId: uuid('message_id').notNull(),
    processedAt: timestamp('processed_at', { withTimezone: true })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    primaryKey({
      columns: [table.consumerName, table.messageId],
      name: 'processed_messages_pkey',
    }),
  ],
);

export type ProcessedMessage = typeof processedMessages.$inferSelect;
export type NewProcessedMessage = typeof processedMessages.$inferInsert;
