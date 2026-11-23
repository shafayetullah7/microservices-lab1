import { z } from 'zod';

export const inventoryEnvSchema = z.object({
  INVENTORY_DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  /** Lab only: sleep before reserveStock (slow service / client timeout experiments). */
  RESERVATION_PROCESSING_DELAY_MS: z.coerce.number().int().min(0).default(0),
  /** Lab only: sleep after DB commit before HTTP response (lost-response experiments). */
  RESERVATION_RESPONSE_DELAY_MS: z.coerce.number().int().min(0).default(0),
});

export type InventoryEnv = z.infer<typeof inventoryEnvSchema>;