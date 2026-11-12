import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { relations } from './relations.js';

export type Database = NodePgDatabase<typeof relations>;

export type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];
