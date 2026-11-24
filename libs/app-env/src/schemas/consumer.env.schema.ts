import { z } from 'zod';
import { messagingEnvSchema } from './messaging.env.schema.js';

export const consumerEnvSchema = messagingEnvSchema.extend({
  /** Max unacked messages per consumer (Day 4 Step 2 prefetch lab). */
  RABBITMQ_CONSUMER_PREFETCH: z.coerce.number().int().min(1).default(1),
  /** Lab only: sleep before ack (crash-before-ack redelivery experiments). */
  CONSUMER_PROCESSING_DELAY_MS: z.coerce.number().int().min(0).default(0),
  /**
   * Lab only: nack invalid payloads with requeue=true (infinite retry demo).
   * Default false drops poison messages.
   */
  CONSUMER_INVALID_NACK_REQUEUE: z
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
    .default(false),
});

export type ConsumerEnv = z.infer<typeof consumerEnvSchema>;