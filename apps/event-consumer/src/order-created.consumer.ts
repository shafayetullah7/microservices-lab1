import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import {
  AppEnvService,
  type ConsumerEnv,
} from '../../../libs/app-env/src/index.js';
import {
  orderCreatedEventSchema,
  RABBITMQ_MESSAGING_OPTIONS,
  RabbitMqConnectionService,
  type RabbitMqMessagingOptions,
} from '../../../libs/messaging/src/index.js';
import type { ConsumeMessage } from 'amqplib';

@Injectable()
export class OrderCreatedConsumer
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(OrderCreatedConsumer.name);
  private consumerTag: string | undefined;

  constructor(
    private readonly rabbitMq: RabbitMqConnectionService,
    @Inject(RABBITMQ_MESSAGING_OPTIONS)
    private readonly options: RabbitMqMessagingOptions,
    private readonly appEnv: AppEnvService<ConsumerEnv>,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.options.enabled) {
      this.logger.warn('RabbitMQ disabled; consumer not started');
      return;
    }

    const channel = this.rabbitMq.getChannel();
    const queue = this.appEnv.get('ORDER_CREATED_QUEUE');
    const { consumerTag } = await channel.consume(
      queue,
      (message) => this.handleMessage(message),
      { noAck: false },
    );
    this.consumerTag = consumerTag;
    this.logger.log(`Consuming ${queue} (order.created events)`);
  }

  private handleMessage(message: ConsumeMessage | null): void {
    if (!message) {
      return;
    }
    const channel = this.rabbitMq.getChannel();
    try {
      const raw: unknown = JSON.parse(message.content.toString('utf8'));
      const event = orderCreatedEventSchema.parse(raw);
      this.logger.log(
        `order.created orderId=${event.orderId} productId=${event.productId} quantity=${event.quantity} status=${event.status}`,
      );
      channel.ack(message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(`Invalid message; nacking without requeue: ${detail}`);
      channel.nack(message, false, false);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.consumerTag) {
      return;
    }
    const channel = this.rabbitMq.getChannel();
    await channel.cancel(this.consumerTag).catch(() => {});
    this.consumerTag = undefined;
  }
}