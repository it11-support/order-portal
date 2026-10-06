-- AlterTable
ALTER TABLE "item_prices" ALTER COLUMN "price" DROP NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "vat_group" VARCHAR(50),
ADD COLUMN     "vat_rate" DECIMAL(19,6);
