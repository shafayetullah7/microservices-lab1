import { z } from 'zod';

export const orderStatusSchema = z.enum(['PENDING', 'RESERVED', 'REJECTED']);

export const orderResponseSchema = z.object({
  id: z.uuid(),
  status: orderStatusSchema,
  productId: z.uuid(),
  quantity: z.number().int().positive(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  reservationId: z.uuid().optional(),
});

export const orderPaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export const orderListResponseSchema = z.object({
  data: z.array(orderResponseSchema),
  pagination: orderPaginationSchema,
});