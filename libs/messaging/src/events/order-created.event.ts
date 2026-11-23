import { z } from 'zod';

export const orderCreatedEventSchema = z.object({
  eventType: z.literal('order.created'),
  orderId: z.uuid(),
  productId: z.uuid(),
  quantity: z.number().int().positive(),
  status: z.enum(['PENDING', 'RESERVED', 'REJECTED']),
  occurredAt: z.iso.datetime(),
});

export type OrderCreatedEvent = z.infer<typeof orderCreatedEventSchema>;