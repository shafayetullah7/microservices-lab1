import { lineItemQuantitySchema } from '../../../../../libs/http/src/index.js';
import { z } from 'zod';

export const createOrderSchema = z.object({
  productId: z.uuid({ error: 'productId must be a valid UUID' }),
  quantity: lineItemQuantitySchema,
});

export type CreateOrderDto = z.infer<typeof createOrderSchema>;
