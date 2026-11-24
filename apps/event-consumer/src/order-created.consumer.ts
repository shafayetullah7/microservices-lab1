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

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

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
    const prefetch = this.appEnv.get('RABBITMQ_CONSUMER_PREFETCH');
    await channel.prefetch(prefetch);
    const { consumerTag } = await channel.consume(
      queue,
      (message) => {
        void this.handleMessage(message);
      },
      { noAck: false },
    );
    this.consumerTag = consumerTag;
    this.logger.log(
      `Consuming ${queue} (order.created events, prefetch=${prefetch})`,
    );
  }

  private async handleMessage(message: ConsumeMessage | null): Promise<void> {
    if (!message) {
      return;
    }
    const channel = this.rabbitMq.getChannel();
    const nackRequeue = this.appEnv.get('CONSUMER_INVALID_NACK_REQUEUE');
    try {
      const raw: unknown = JSON.parse(message.content.toString('utf8'));
      const event = orderCreatedEventSchema.parse(raw);
      const redelivered = message.fields.redelivered;
      const delayMs = this.appEnv.get('CONSUMER_PROCESSING_DELAY_MS');
      if (delayMs > 0) {
        await sleep(delayMs);
      }
      this.logger.log(
        redelivered
          ? `order.created redelivered=true orderId=${event.orderId} productId=${event.productId} quantity=${event.quantity} status=${event.status}`
          : `order.created orderId=${event.orderId} productId=${event.productId} quantity=${event.quantity} status=${event.status}`,
      );
      channel.ack(message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      this.logger.error(
        nackRequeue
          ? `Invalid message; nacking with requeue: ${detail}`
          : `Invalid message; nacking without requeue: ${detail}`,
      );
      channel.nack(message, false, nackRequeue);
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