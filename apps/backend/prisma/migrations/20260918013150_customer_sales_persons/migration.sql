-- DropForeignKey
ALTER TABLE "follow_up_notes" DROP CONSTRAINT "follow_up_notes_author_id_fkey";

-- DropForeignKey
ALTER TABLE "follow_up_notes" DROP CONSTRAINT "follow_up_notes_request_id_fkey";

-- CreateIndex
CREATE INDEX "customers_slp_code_idx" ON "customers"("slp_code");

-- AddForeignKey
ALTER TABLE "follow_up_notes" ADD CONSTRAINT "follow_up_notes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "portal_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_up_notes" ADD CONSTRAINT "follow_up_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
