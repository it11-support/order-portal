CREATE TABLE "portal_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "customer_id" BIGINT NOT NULL REFERENCES "customers"("id"),
  "kind" TEXT NOT NULL CHECK ("kind" IN ('order', 'quote')),
  "status" TEXT NOT NULL DEFAULT 'pending' CHECK ("status" IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled')),
  "items" JSONB NOT NULL,
  "notes" TEXT NOT NULL DEFAULT '',
  "sales_notes" TEXT NOT NULL DEFAULT '',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);
CREATE INDEX "portal_requests_customer_id_created_at_idx" ON "portal_requests"("customer_id", "created_at");
