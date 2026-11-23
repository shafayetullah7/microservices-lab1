export const RABBITMQ_MESSAGING_OPTIONS = Symbol('RABBITMQ_MESSAGING_OPTIONS');

export type RabbitMqMessagingOptions = {
  enabled: boolean;
  url: string;
  exchange: string;
  routingKey: string;
  queue: string;
};