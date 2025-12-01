
-- Create product_units table
CREATE TABLE "product_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"unit_name" varchar(50) NOT NULL,
	"conversion_to_base" numeric(15, 2) NOT NULL,
	"is_base_unit" boolean DEFAULT false NOT NULL,
	"selling_price" numeric(15, 2) NOT NULL,
	"cost_price" numeric(15, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraint
ALTER TABLE "product_units" ADD CONSTRAINT "product_units_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;

-- Add index
CREATE INDEX "product_units_product_id_idx" ON "product_units" USING btree ("product_id");
