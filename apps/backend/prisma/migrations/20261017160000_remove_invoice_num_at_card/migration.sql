ALTER TABLE "sales_invoices"
DROP COLUMN IF EXISTS "num_at_card";

ALTER TABLE "retur_invoices"
DROP COLUMN IF EXISTS "num_at_card";