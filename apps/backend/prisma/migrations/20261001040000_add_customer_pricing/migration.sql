-- CreateTable
CREATE TABLE "customer_item_prices" (
    "customer_id" BIGINT NOT NULL,
    "item_code" VARCHAR(255) NOT NULL,
    "price" DECIMAL(19,6) NOT NULL,
    "currency" VARCHAR(10),
    "discount_applied" DECIMAL(9,4) NOT NULL DEFAULT 0,
    "last_changed_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(0) NOT NULL,

    CONSTRAINT "customer_item_prices_pkey" PRIMARY KEY ("customer_id","item_code")
);

-- CreateTable
CREATE TABLE "price_change_logs" (
    "id" TEXT NOT NULL,
    "customer_id" BIGINT NOT NULL,
    "item_code" VARCHAR(255) NOT NULL,
    "old_price" DECIMAL(19,6),
    "new_price" DECIMAL(19,6) NOT NULL,
    "change_pct" DECIMAL(9,4) NOT NULL,
    "direction" CHAR(4) NOT NULL,
    "notified_at" TIMESTAMP(0),
    "created_at" TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "price_change_logs_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "discount_level" DECIMAL(9,4);

-- CreateIndex
CREATE INDEX "customer_item_prices_item_code_idx" ON "customer_item_prices"("item_code");

-- CreateIndex
CREATE INDEX "price_change_logs_customer_id_created_at_idx" ON "price_change_logs"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "price_change_logs_direction_notified_at_idx" ON "price_change_logs"("direction", "notified_at");

-- AddForeignKey
ALTER TABLE "customer_item_prices" ADD CONSTRAINT "customer_item_prices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_change_logs" ADD CONSTRAINT "price_change_logs_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;