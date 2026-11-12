import { z } from 'zod';

export const orderEnvSchema = z.object({
  ORDER_DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export type OrderEnv = z.infer<typeof orderEnvSchema>;
