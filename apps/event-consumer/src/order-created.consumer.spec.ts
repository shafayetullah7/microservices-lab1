import { Test } from '@nestjs/testing';
import { AppEnvService } from '../../../libs/app-env/src/index.js';
import {
  RABBITMQ_MESSAGING_OPTIONS,
  RabbitMqConnectionService,
} from '../../../libs/messaging/src/index.js';
import { OrderCreatedConsumer } from './order-created.consumer.js';
import type { ConsumeMessage } from 'amqplib';

const orderId = '11111111-1111-4111-8111-111111111111';
const productId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function buildMessage(
  body: string,
  redelivered = false,
): ConsumeMessage {
  return {
    content: Buffer.from(body, 'utf8'),
    fields: {
      deliveryTag: 1,
      redelivered,
      exchange: 'orders.events',
      routingKey: 'order.created',
      consumerTag: 'tag',
    },
    properties: {},
  } as ConsumeMessage;
}

function createAppEnv(overrides: {
  prefetch?: number;
  delayMs?: number;
  nackRequeue?: boolean;
} = {}) {
  const values = {
    ORDER_CREATED_QUEUE: 'order.created.log',
    RABBITMQ_CONSUMER_PREFETCH: overrides.prefetch ?? 1,
    CONSUMER_PROCESSING_DELAY_MS: overrides.delayMs ?? 0,
    CONSUMER_INVALID_NACK_REQUEUE: overrides.nackRequeue ?? false,
  };
  return {
    get: vi.fn((key: keyof typeof values) => values[key]),
  };
}

async function createConsumer(appEnv: ReturnType<typeof createAppEnv>) {
  let consumeCallback: ((message: ConsumeMessage | null) => void) | undefined;
  const channel = {
    prefetch: vi.fn().mockResolvedValue(undefined),
    consume: vi
      .fn()
      .mockImplementation(
        async (
          _queue: string,
          callback: (message: ConsumeMessage | null) => void,
        ) => {
          consumeCallback = callback;
          return { consumerTag: 'tag-1' };
        },
      ),
    ack: vi.fn(),
    nack: vi.fn(),
    cancel: vi.fn(),
  };
  const rabbitMq = { getChannel: () => channel };

  const moduleRef = await Test.createTestingModule({
    providers: [
      OrderCreatedConsumer,
      { provide: RabbitMqConnectionService, useValue: rabbitMq },
      {
        provide: RABBITMQ_MESSAGING_OPTIONS,
        useValue: { enabled: true },
      },
      { provide: AppEnvService, useValue: appEnv },
    ],
  }).compile();

  const consumer = moduleRef.get(OrderCreatedConsumer);
  await consumer.onModuleInit();
  return { channel, consumeCallback: consumeCallback! };
}

describe('OrderCreatedConsumer', () => {
  const validBody = JSON.stringify({
    eventType: 'order.created',
    orderId,
    productId,
    quantity: 2,
    status: 'PENDING',
    occurredAt: '2025-01-01T00:00:00.000Z',
  });

  it('calls prefetch before consume on init', async () => {
    const appEnv = createAppEnv({ prefetch: 5 });
    const { channel } = await createConsumer(appEnv);
    expect(channel.prefetch).toHaveBeenCalledWith(5);
  });

  it('acks valid messages', async () => {
    const appEnv = createAppEnv();
    const { channel, consumeCallback } = await createConsumer(appEnv);
    consumeCallback(buildMessage(validBody));
    await vi.waitFor(() => expect(channel.ack).toHaveBeenCalledTimes(1));
    expect(channel.nack).not.toHaveBeenCalled();
  });

  it('nacks invalid messages without requeue by default', async () => {
    const appEnv = createAppEnv({ nackRequeue: false });
    const { channel, consumeCallback } = await createConsumer(appEnv);
    consumeCallback(buildMessage('{'));
    await vi.waitFor(() => expect(channel.nack).toHaveBeenCalledTimes(1));
    expect(channel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      false,
    );
    expect(channel.ack).not.toHaveBeenCalled();
  });

  it('nacks invalid messages with requeue when configured', async () => {
    const appEnv = createAppEnv({ nackRequeue: true });
    const { channel, consumeCallback } = await createConsumer(appEnv);
    consumeCallback(buildMessage('{}'));
    await vi.waitFor(() => expect(channel.nack).toHaveBeenCalledTimes(1));
    expect(channel.nack).toHaveBeenCalledWith(
      expect.anything(),
      false,
      true,
    );
  });
});