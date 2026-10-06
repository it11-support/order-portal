-- Orders and inquiries now have separate pages, so a notification must record
-- which list it belongs to. Existing rows keep NULL: their links fall back to
-- the orders list.
ALTER TABLE "notifications" ADD COLUMN "kind" VARCHAR(10);