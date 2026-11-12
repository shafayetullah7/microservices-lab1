CREATE TABLE "inventory_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"status" varchar(24) NOT NULL,
	"idempotency_key" varchar(160) NOT NULL CONSTRAINT "inventory_reservations_idempotency_key_unique" UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_reservations_quantity_check" CHECK ("quantity" > 0),
	CONSTRAINT "inventory_reservations_status_check" CHECK ("status" in ('reserved', 'released', 'committed'))
);
--> statement-breakpoint
CREATE TABLE "outbox_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"event_type" varchar(120) NOT NULL,
	"event_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	"attempt_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_messages" (
	"consumer_name" varchar(100),
	"message_id" uuid,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "processed_messages_pkey" PRIMARY KEY("consumer_name","message_id")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"sku" varchar(80) NOT NULL CONSTRAINT "products_sku_unique" UNIQUE,
	"name" varchar(255) NOT NULL,
	"available_quantity" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_available_quantity_check" CHECK ("available_quantity" >= 0)
);
--> statement-breakpoint
CREATE INDEX "inventory_reservations_order_id_idx" ON "inventory_reservations" ("order_id");--> statement-breakpoint
CREATE INDEX "inventory_reservations_product_id_status_idx" ON "inventory_reservations" ("product_id","status");--> statement-breakpoint
CREATE INDEX "outbox_events_published_at_created_at_idx" ON "outbox_events" ("published_at","created_at");--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_id_products_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id");