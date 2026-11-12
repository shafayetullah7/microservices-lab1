import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './apps/inventory-service/src/db/schema/index.ts',
  out: './apps/inventory-service/drizzle',
  dbCredentials: {
    url: process.env.INVENTORY_DATABASE_URL!,
  },
});
