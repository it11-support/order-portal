ALTER TABLE "products"
    DROP COLUMN "sales_pack_unit",
    ADD COLUMN "inventory_unit" TEXT,
    ADD COLUMN "purchase_pack_size" DECIMAL(19,6),
    ADD COLUMN "purchase_unit" TEXT;