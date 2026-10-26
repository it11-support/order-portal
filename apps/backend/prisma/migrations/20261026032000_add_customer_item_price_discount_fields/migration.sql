ALTER TABLE "customer_item_prices"
    ADD COLUMN IF NOT EXISTS "discount_source" VARCHAR(10) NOT NULL DEFAULT 'none',
    ADD COLUMN IF NOT EXISTS "last_invoice_discount" DECIMAL(9,4),
    ADD COLUMN IF NOT EXISTS "last_invoice_base_price" DECIMAL(19,6);