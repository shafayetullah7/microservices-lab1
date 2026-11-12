import { z } from 'zod';

export const inventoryEnvSchema = z.object({
  INVENTORY_DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
});

export type InventoryEnv = z.infer<typeof inventoryEnvSchema>;
