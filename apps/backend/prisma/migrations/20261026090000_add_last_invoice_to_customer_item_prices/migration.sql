ALTER TABLE "customer_item_prices"
ADD COLUMN "last_invoice_price" DECIMAL(19,6),
ADD COLUMN "last_invoice_date" TIMESTAMP(6),
ADD COLUMN "last_invoice_num" VARCHAR(50);