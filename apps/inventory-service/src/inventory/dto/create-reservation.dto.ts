import { lineItemQuantitySchema } from '../../../../../libs/http/src/index.js';
import { z } from 'zod';

export const createReservationSchema = z.object({
  orderId: z.uuid({ error: 'orderId must be a valid UUID' }),
  productId: z.uuid({ error: 'productId must be a valid UUID' }),
  quantity: lineItemQuantitySchema,
});

export type CreateReservationDto = z.infer<typeof createReservationSchema>;
