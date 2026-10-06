-- AlterTable
-- Credit and freeze columns for the customers table.
--
-- credit_limit / balance carry the SAP OCRD credit exposure; frozen_for marks the
-- account as blocked for ordering, with frozen_from / frozen_to recording the
-- window of that block. Char(1) rather than boolean because SAP stores a flag
-- letter, and the dashboard compares it against 'Y'.
ALTER TABLE "customers"
ADD COLUMN     "credit_limit" DECIMAL(19, 6) DEFAULT 0,
ADD COLUMN     "balance" DECIMAL(19, 6) DEFAULT 0,
ADD COLUMN     "frozen_for" CHAR(1) DEFAULT 'N',
ADD COLUMN     "frozen_from" TIMESTAMP,
ADD COLUMN     "frozen_to" TIMESTAMP;