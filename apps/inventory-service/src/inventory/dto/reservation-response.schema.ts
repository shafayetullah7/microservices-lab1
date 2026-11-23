import { z } from 'zod';

export const reservationSuccessSchema = z.object({
  status: z.enum(['reserved', 'already_reserved']),
  reservationId: z.uuid(),
});

export const reservationConflictSchema = z.object({
  status: z.enum(['insufficient_stock', 'conflict']),
  message: z.string(),
});