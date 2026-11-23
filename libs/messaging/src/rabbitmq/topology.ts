import type { Channel } from 'amqplib';

export type RabbitMqTopologyConfig = {
  exchange: string;
  queue: string;
  routingKey: string;
};

export async function assertRabbitMqTopology(
  channel: Channel,
  config: RabbitMqTopologyConfig,
): Promise<void> {
  await channel.assertExchange(config.exchange, 'topic', { durable: true });
  await channel.assertQueue(config.queue, { durable: true });
  await channel.bindQueue(
    config.queue,
    config.exchange,
    config.routingKey,
  );
}