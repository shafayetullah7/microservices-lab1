import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { sql } from 'drizzle-orm';
import type { Database, DatabaseTransaction } from '../db/database.js';

@Injectable()
export class DatabaseService {
  constructor(@InjectDrizzle() readonly db: Database) {}

  /**
   * Transaction-scoped advisory lock keyed by order id.
   * Released automatically on commit or rollback.
   */
  async acquireOrderAdvisoryLock(
    tx: DatabaseTransaction,
    orderId: string,
  ): Promise<void> {
    await tx.execute(sql`
      SELECT pg_advisory_xact_lock(hashtextextended(${orderId}, 0))
    `);
  }
}
