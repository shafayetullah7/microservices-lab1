import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { waitForRabbitMq } from '../rabbitmq/wait-for-rabbitmq.js';
import { RABBITMQ_READINESS_OPTIONS } from './readiness.constants.js';

export type RabbitMqReadinessOptions = {
  enabled: boolean;
  url: string;
  label?: string;
  maxAttempts?: number;
  intervalMs?: number;
};

@Injectable()
export class RabbitMqReadinessService implements OnModuleInit {
  private readonly logger = new Logger(RabbitMqReadinessService.name);

  constructor(
    @Inject(RABBITMQ_READINESS_OPTIONS)
    private readonly options: RabbitMqReadinessOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.options.enabled) {
      return;
    }
    const label = this.options.label ?? 'RabbitMQ';
    this.logger.log(`Waiting for ${label} to accept connections…`);

    await waitForRabbitMq(this.options.url, {
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