import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './apps/order-service/src/db/schema/index.ts',
  out: './apps/order-service/drizzle',
  dbCredentials: {
    url: process.env.ORDER_DATABASE_URL!,
  },
});
