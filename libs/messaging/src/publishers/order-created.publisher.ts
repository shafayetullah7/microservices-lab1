import { Inject, Injectable } from '@nestjs/common';
import {
  orderCreatedEventSchema,
  type OrderCreatedEvent,
} from '../events/order-created.event.js';
import {
  RABBITMQ_MESSAGING_OPTIONS,
  type RabbitMqMessagingOptions,
} from '../rabbitmq/messaging.constants.js';
import { RabbitMqConnectionService } from '../rabbitmq/connection.service.js';

@Injectable()
export class OrderCreatedPublisher {
  constructor(
    private readonly rabbitMq: RabbitMqConnectionService,
    @Inject(RABBITMQ_MESSAGING_OPTIONS)
    private readonly options: RabbitMqMessagingOptions,
  ) {}

  async publish(event: OrderCreatedEvent): Promise<void> {
    if (!this.options.enabled) {
      return;
    }
    const payload = orderCreatedEventSchema.parse(event);
    const channel = this.rabbitMq.getChannel();
    const body = Buffer.from(JSON.stringify(payload));
    const sent = channel.publish(
      this.options.exchange,
      this.options.routingKey,
      body,
      {
        contentType: 'application/json',
        persistent: true,
      },
    );
    if (!sent) {
      throw new Error('RabbitMQ publish buffer full (order.created)');
    }
  }
}