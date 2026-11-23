import type { z } from 'zod';
import { messagingEnvSchema } from './messaging.env.schema.js';

export const consumerEnvSchema = messagingEnvSchema;

export type ConsumerEnv = z.infer<typeof consumerEnvSchema>;