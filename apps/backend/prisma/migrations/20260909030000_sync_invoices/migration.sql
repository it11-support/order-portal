-- CreateTable
CREATE TABLE "sales_invoices" (
    "id" BIGSERIAL NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "doc_entry" INTEGER NOT NULL,
    "doc_num" INTEGER NOT NULL,
    "line_num" INTEGER NOT NULL,
    "doc_date" TIMESTAMP(0) NOT NULL,
    "card_code" VARCHAR(255) NOT NULL,
    "card_name" VARCHAR(255),
    "item_code" VARCHAR(255),
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "inventory_quantity" DECIMAL(19,6) NOT NULL,
    "qty_kg" DECIMAL(19,6),
    "unit_msr" VARCHAR(255),
    "inventory_uom" VARCHAR(255),
    "price_bef_disc" DECIMAL(19,6),
    "disc_line" DECIMAL(19,6),
    "disc_total" DECIMAL(19,6),
    "line_total" DECIMAL(19,6),
    "total_sales" DECIMAL(19,6),
    "currency" VARCHAR(10),
    "canceled" CHAR(1) NOT NULL DEFAULT 'N',
    "base_type" INTEGER,
    "base_entry" INTEGER,
    "base_line" INTEGER,
    "dwh_created_at" TIMESTAMP(0),
    "dwh_updated_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_checkpoints" (
    "job_name" TEXT NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "source_watermark" TIMESTAMP(0) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sync_checkpoints_pkey" PRIMARY KEY ("job_name","company_id")
);

-- CreateTable
CREATE TABLE "retur_invoices" (
    "id" BIGSERIAL NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "doc_entry" INTEGER NOT NULL,
    "doc_num" INTEGER NOT NULL,
    "line_num" INTEGER NOT NULL,
    "doc_date" TIMESTAMP(0) NOT NULL,
    "card_code" VARCHAR(255) NOT NULL,
    "card_name" VARCHAR(255),
    "item_code" VARCHAR(255),
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "inventory_quantity" DECIMAL(19,6) NOT NULL,
    "qty_kg" DECIMAL(19,6),
    "unit_msr" VARCHAR(255),
    "inventory_uom" VARCHAR(255),
    "price_bef_disc" DECIMAL(19,6),
    "disc_line" DECIMAL(19,6),
    "disc_total" DECIMAL(19,6),
    "line_total" DECIMAL(19,6),
    "total_sales" DECIMAL(19,6),
    "currency" VARCHAR(10),
    "canceled" CHAR(1) NOT NULL DEFAULT 'N',
    "base_type" INTEGER,
    "base_entry" INTEGER,
    "base_line" INTEGER,
    "dwh_created_at" TIMESTAMP(0),
    "dwh_updated_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retur_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_invoices_card_code_item_code_idx" ON "sales_invoices"("card_code", "item_code");

-- CreateIndex
CREATE INDEX "sales_invoices_card_code_doc_num_idx" ON "sales_invoices"("card_code", "doc_num");

-- CreateIndex
CREATE INDEX "sales_invoices_doc_date_idx" ON "sales_invoices"("doc_date");

-- CreateIndex
CREATE INDEX "sales_invoices_company_id_card_code_idx" ON "sales_invoices"("company_id", "card_code");

-- CreateIndex
CREATE UNIQUE INDEX "sales_invoices_company_id_doc_entry_line_num_key" ON "sales_invoices"("company_id", "doc_entry", "line_num");

-- CreateIndex
CREATE INDEX "retur_invoices_card_code_item_code_idx" ON "retur_invoices"("card_code", "item_code");

-- CreateIndex
CREATE INDEX "retur_invoices_card_code_doc_num_idx" ON "retur_invoices"("card_code", "doc_num");

-- CreateIndex
CREATE INDEX "retur_invoices_doc_date_idx" ON "retur_invoices"("doc_date");

-- CreateIndex
CREATE INDEX "retur_invoices_company_id_card_code_idx" ON "retur_invoices"("company_id", "card_code");

-- CreateIndex
CREATE UNIQUE INDEX "retur_invoices_company_id_doc_entry_line_num_key" ON "retur_invoices"("company_id", "doc_entry", "line_num");
