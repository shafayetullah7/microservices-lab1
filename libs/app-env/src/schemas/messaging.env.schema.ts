import { z } from 'zod';

export const messagingEnvSchema = z.object({
  RABBITMQ_ENABLED: z
    .union([z.boolean(), z.string(), z.number()])
    .transform((value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (typeof value === 'number') {
        return value !== 0;
      }
      const normalized = value.trim().toLowerCase();
      if (['1', 'true', 'yes', 'on'].includes(normalized)) {
        return true;
      }
      if (['0', 'false', 'no', 'off', ''].includes(normalized)) {
        return false;
      }
      throw new Error(`Invalid boolean env value: ${value}`);
    })
    .default(true),
  RABBITMQ_URL: z
    .string()
    .min(1)
    .default('amqp://lab:lab@127.0.0.1:5672'),
  ORDER_EVENTS_EXCHANGE: z.string().min(1).default('orders.events'),
  ORDER_CREATED_ROUTING_KEY: z.string().min(1).default('order.created'),
  ORDER_CREATED_QUEUE: z.string().min(1).default('order.created.log'),
});

export type MessagingEnv = z.infer<typeof messagingEnvSchema>;