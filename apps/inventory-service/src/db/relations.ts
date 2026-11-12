import { defineRelations } from 'drizzle-orm';
import * as schema from './schema/index.js';

export const relations = defineRelations(schema, (r) => ({
  products: {
    reservations: r.many.inventoryReservations(),
  },
  inventoryReservations: {
    product: r.one.products({
      from: r.inventoryReservations.productId,
      to: r.products.id,
    }),
  },
}));
