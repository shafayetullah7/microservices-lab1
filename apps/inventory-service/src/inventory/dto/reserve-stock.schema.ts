import { z } from 'zod';

export const reserveStockSchema = z.object({
  orderId: z.uuid(),
  productId: z.uuid(),
  quantity: z
    .number({ error: 'quantity must be a number' })
    .int({ error: 'quantity must be an integer' })
    .positive({ error: 'quantity must be greater than zero' }),
});

export type ReserveStockBody = z.infer<typeof reserveStockSchema>;
