import { z } from 'zod';

export const listOrdersSortBySchema = z.enum(['createdAt', 'updatedAt']);
export const listOrdersSortOrderSchema = z.enum(['asc', 'desc']);

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: listOrdersSortBySchema.default('createdAt'),
  sortOrder: listOrdersSortOrderSchema.default('desc'),
});

export type ListOrdersSortBy = z.infer<typeof listOrdersSortBySchema>;
export type ListOrdersSortOrder = z.infer<typeof listOrdersSortOrderSchema>;
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;