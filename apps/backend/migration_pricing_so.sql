-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "price_list_num" INTEGER;

-- CreateTable
CREATE TABLE "price_lists" (
    "id" BIGSERIAL NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "list_num" INTEGER NOT NULL,
    "list_name" VARCHAR(100) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "price_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_prices" (
    "id" BIGSERIAL NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "list_num" INTEGER NOT NULL,
    "item_code" VARCHAR(255) NOT NULL,
    "price" DECIMAL(19,6) NOT NULL,
    "currency" VARCHAR(10),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "item_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" BIGSERIAL NOT NULL,
    "company_id" VARCHAR(255) NOT NULL,
    "doc_entry" INTEGER NOT NULL,
    "doc_num" INTEGER NOT NULL,
    "doc_date" TIMESTAMP(0) NOT NULL,
    "doc_due_date" TIMESTAMP(0),
    "card_code" VARCHAR(255) NOT NULL,
    "card_name" VARCHAR(255),
    "doc_status" CHAR(1) NOT NULL,
    "canceled" CHAR(1) NOT NULL DEFAULT 'N',
    "doc_total" DECIMAL(19,6),
    "currency" VARCHAR(10),
    "slp_code" INTEGER,
    "sap_updated_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_lines" (
    "id" BIGSERIAL NOT NULL,
    "sales_order_id" BIGINT NOT NULL,
    "line_num" INTEGER NOT NULL,
    "item_code" VARCHAR(255),
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(19,6) NOT NULL,
    "open_qty" DECIMAL(19,6) NOT NULL,
    "price" DECIMAL(19,6),
    "line_total" DECIMAL(19,6),
    "line_status" CHAR(1),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "sales_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "price_lists_company_id_idx" ON "price_lists"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "price_lists_company_id_list_num_key" ON "price_lists"("company_id", "list_num");

-- CreateIndex
CREATE INDEX "item_prices_company_id_item_code_idx" ON "item_prices"("company_id", "item_code");

-- CreateIndex
CREATE INDEX "item_prices_company_id_list_num_idx" ON "item_prices"("company_id", "list_num");

-- CreateIndex
CREATE UNIQUE INDEX "item_prices_company_id_list_num_item_code_key" ON "item_prices"("company_id", "list_num", "item_code");

-- CreateIndex
CREATE INDEX "sales_orders_company_id_doc_status_idx" ON "sales_orders"("company_id", "doc_status");

-- CreateIndex
CREATE INDEX "sales_orders_company_id_card_code_idx" ON "sales_orders"("company_id", "card_code");

-- CreateIndex
CREATE INDEX "sales_orders_card_code_doc_date_idx" ON "sales_orders"("card_code", "doc_date");

-- CreateIndex
CREATE INDEX "sales_orders_doc_num_idx" ON "sales_orders"("doc_num");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_company_id_doc_entry_key" ON "sales_orders"("company_id", "doc_entry");

-- CreateIndex
CREATE INDEX "sales_order_lines_item_code_idx" ON "sales_order_lines"("item_code");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_lines_sales_order_id_line_num_key" ON "sales_order_lines"("sales_order_id", "line_num");

-- CreateIndex
CREATE INDEX "customers_price_list_num_idx" ON "customers"("price_list_num");

-- AddForeignKey
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

