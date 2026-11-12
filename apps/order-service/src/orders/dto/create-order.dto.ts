import { z } from 'zod';

export const createOrderSchema = z.object({
  productId: z.uuid({ error: 'productId must be a valid UUID' }),
  quantity: z
    .number({ error: 'quantity must be a number' })
    .int({ error: 'quantity must be an integer' })
    .positive({ error: 'quantity must be greater than zero' }),
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
