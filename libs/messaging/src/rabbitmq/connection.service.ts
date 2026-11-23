import {
  Inject,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import amqp, { type Channel, type ChannelModel } from 'amqplib';
import {
  RABBITMQ_MESSAGING_OPTIONS,
  type RabbitMqMessagingOptions,
} from './messaging.constants.js';
import { assertRabbitMqTopology } from './topology.js';

@Injectable()
export class RabbitMqConnectionService
  implements OnModuleInit, OnModuleDestroy
{
  private connection: ChannelModel | undefined;
  private channel: Channel | undefined;

  constructor(
    @Inject(RABBITMQ_MESSAGING_OPTIONS)
    private readonly options: RabbitMqMessagingOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.options.enabled) {
      return;
    }
    this.connection = await amqp.connect(this.options.url);
    this.channel = await this.connection.createChannel();
    await assertRabbitMqTopology(this.channel, {
      exchange: this.options.exchange,
      queue: this.options.queue,
      routingKey: this.options.routingKey,
    });
  }

  getChannel(): Channel {
    if (!this.channel) {
      throw new Error('RabbitMQ channel is not initialized');
    }
    return this.channel;
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close().catch(() => {});
    await this.connection?.close().catch(() => {});
    this.channel = undefined;
    this.connection = undefined;
  }
}