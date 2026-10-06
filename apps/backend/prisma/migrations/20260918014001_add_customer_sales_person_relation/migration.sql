-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_slp_code_fkey" FOREIGN KEY ("slp_code") REFERENCES "sales_persons"("slp_code") ON DELETE SET NULL ON UPDATE CASCADE;
