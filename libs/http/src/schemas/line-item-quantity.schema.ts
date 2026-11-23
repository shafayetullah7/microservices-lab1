import { z } from 'zod';

/** Upper bound of PostgreSQL `integer` (used for `order_items.quantity`). */
export const PG_INTEGER_MAX = 2_147_483_647;

export const lineItemQuantitySchema = z
  .number({ error: 'quantity must be a number' })
  .int({ error: 'quantity must be an integer' })
  .positive({ error: 'quantity must be greater than zero' })
  .max(PG_INTEGER_MAX, {
    error: `quantity must be at most ${PG_INTEGER_MAX}`,
  })
  .meta({
    description:
      'Units to order or reserve (positive integer, fits PostgreSQL `integer`).',
    examples: [1],
  });