ALTER TABLE "sales_invoices"
ADD COLUMN IF NOT EXISTS "num_at_card" VARCHAR(100);

ALTER TABLE "retur_invoices"
ADD COLUMN IF NOT EXISTS "num_at_card" VARCHAR(100);