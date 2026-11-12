CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_minor" bigint NOT NULL,
	"currency" char(3) NOT NULL,
	CONSTRAINT "order_items_quantity_check" CHECK ("quantity" > 0),
	CONSTRAINT "order_items_unit_price_minor_check" CHECK ("unit_price_minor" >= 0)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"customer_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_status_check" CHECK ("status" in ('pending', 'processing', 'confirmed', 'failed', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"aggregate_id" uuid NOT NULL,
	"event_type" varchar(120) NOT NULL,
	"event_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id");--> statement-breakpoint
CREATE INDEX "orders_status_created_at_idx" ON "orders" ("status","created_at");--> statement-breakpoint
CREATE INDEX "outbox_events_published_at_created_at_idx" ON "outbox_events" ("published_at","created_at");--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id");