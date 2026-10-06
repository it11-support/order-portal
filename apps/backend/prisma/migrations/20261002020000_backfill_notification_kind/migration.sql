-- Backfill notification kind for rows created before orders and inquiries were
-- split into separate lists.
--
-- The request id prefix is the only surviving record of which list a legacy
-- notification belongs to: createRequest builds `ORD-<uuid>` and `RFQ-<uuid>`.
-- Rows that match neither keep NULL, and the UI falls back to the orders list.
UPDATE "notifications" SET "kind" = 'quote' WHERE "kind" IS NULL AND "related_id" LIKE 'RFQ-%';
UPDATE "notifications" SET "kind" = 'order' WHERE "kind" IS NULL AND "related_id" LIKE 'ORD-%';