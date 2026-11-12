import { z } from 'zod';

export const orderEnvSchema = z.object({
  ORDER_DATABASE_URL: z.string().min(1),
  INVENTORY_SERVICE_URL: z.string().url(),
  INVENTORY_HTTP_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(3_000),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
});

export type OrderEnv = z.infer<typeof orderEnvSchema>;
