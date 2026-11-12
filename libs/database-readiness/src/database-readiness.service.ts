import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { DATABASE_READINESS_OPTIONS } from './database-readiness.constants.js';
import { waitForPostgres } from './wait-for-postgres.js';

export type DatabaseReadinessOptions = {
  connectionString: string;
  label?: string;
  maxAttempts?: number;
  intervalMs?: number;
};

@Injectable()
export class DatabaseReadinessService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseReadinessService.name);

  constructor(
    @Inject(DATABASE_READINESS_OPTIONS)
    private readonly options: DatabaseReadinessOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    const label = this.options.label ?? 'database';
    this.logger.log(`Waiting for ${label} to accept connections…`);

    await waitForPostgres(this.options.connectionString, {
      maxAttempts: this.options.maxAttempts,
      intervalMs: this.options.intervalMs,
      onRetry: (attempt, error) => {
        const detail =
          error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `${label} not ready (attempt ${attempt}): ${detail}`,
        );
      },
    });

    this.logger.log(`${label} is ready`);
  }
}
