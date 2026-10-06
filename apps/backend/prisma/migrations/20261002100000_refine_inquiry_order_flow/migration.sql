-- Refined order/inquiry flow:
--   * repeat orders are priced from the customer's actual invoice price, while
--     items they never bought stay on the price list until a deal makes them real
--   * inquiries carry the sales who raised them, the price basis used, and the
--     order they turned into
--   * follow-up notes can be written by the portal itself and hidden from the
--     customer

-- 1. Harga aktual per customer/item.
ALTER TABLE "customer_item_prices"
  ADD COLUMN "source" VARCHAR(10) NOT NULL DEFAULT 'invoice',
  ADD COLUMN "source_doc" VARCHAR(60),
  ADD COLUMN "last_purchased_at" TIMESTAMP(0);

-- 2. Inquiry provenance and order conversion.
ALTER TABLE "portal_requests"
  ADD COLUMN "source" VARCHAR(10) NOT NULL DEFAULT 'customer',
  ADD COLUMN "created_by_id" INTEGER,
  ADD COLUMN "price_basis" VARCHAR(10),
  ADD COLUMN "inquiry_id" VARCHAR(64),
  ADD COLUMN "converted_order_id" VARCHAR(64);

CREATE INDEX "portal_requests_customerId_kind_status_idx" ON "portal_requests" ("customer_id", "kind", "status");
CREATE INDEX "portal_requests_status_kind_idx" ON "portal_requests" ("status", "kind");
CREATE INDEX "portal_requests_inquiry_id_idx" ON "portal_requests" ("inquiry_id");

ALTER TABLE "portal_requests"
  ADD CONSTRAINT "portal_requests_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. System notes and internal-only notes.
ALTER TABLE "follow_up_notes" ALTER COLUMN "author_id" DROP NOT NULL;
ALTER TABLE "follow_up_notes"
  ADD COLUMN "source" VARCHAR(10) NOT NULL DEFAULT 'user',
  ADD COLUMN "visibility" VARCHAR(10) NOT NULL DEFAULT 'customer';

CREATE INDEX "follow_up_notes_visibility_idx" ON "follow_up_notes" ("visibility");

-- 4. Open inquiries are the ones a price change has to reach.
CREATE INDEX "portal_requests_kind_status_idx" ON "portal_requests" ("kind", "status");