-- Link sales_admin users to their SalesPerson (SlpCode)

-- Add slp_code column
ALTER TABLE "users"
ADD COLUMN "slp_code" SMALLINT;

-- Add index
CREATE INDEX "users_slp_code_idx"
ON "users"("slp_code");