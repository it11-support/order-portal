-- DropForeignKey
ALTER TABLE "follow_up_notes" DROP CONSTRAINT "follow_up_notes_author_id_fkey";

-- DropIndex
DROP INDEX "portal_requests_customer_id_created_at_idx";

-- DropIndex
DROP INDEX "portal_requests_kind_status_idx";

-- DropIndex
DROP INDEX "sales_orders_portal_ref_idx";

-- AlterTable
ALTER TABLE "customer_item_prices" ALTER COLUMN "last_changed_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "customers" ALTER COLUMN "frozen_from" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "frozen_to" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "portal_requests" ALTER COLUMN "sap_synced_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "price_change_logs" ALTER COLUMN "notified_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" DROP COLUMN "sales_pack_unit",
ADD COLUMN     "inventory_unit" TEXT,
ADD COLUMN     "purchase_pack_size" DECIMAL(19,6),
ADD COLUMN     "purchase_unit" TEXT;

-- AlterTable
ALTER TABLE "sales_orders" ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updated_at" SET DATA TYPE TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "customer_item_prices" ADD CONSTRAINT "customer_item_prices_item_code_fkey" FOREIGN KEY ("item_code") REFERENCES "products"("item_code") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_notes" ADD CONSTRAINT "follow_up_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "portal_requests_customerId_kind_status_idx" RENAME TO "portal_requests_customer_id_kind_status_idx";

