import { defineRelations } from 'drizzle-orm';
import * as schema from './schema/index.js';

export const relations = defineRelations(schema, (r) => ({
  orders: {
    items: r.many.orderItems(),
  },
  orderItems: {
    order: r.one.orders({
      from: r.orderItems.orderId,
      to: r.orders.id,
    }),
  },
}));
