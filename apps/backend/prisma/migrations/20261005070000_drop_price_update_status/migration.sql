-- The "update harga di sistem" step is gone: accepting the quoted price makes
-- the inquiry orderable straight away. Any inquiry still parked in that step is
-- moved forward so nothing is stranded in a status the application no longer
-- offers or accepts.
UPDATE "portal_requests" SET "status" = 'ready' WHERE "status" = 'price_update';

-- The status constraint is rewritten to match the reduced flow.
ALTER TABLE "portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_status_check";

ALTER TABLE "portal_requests"
  ADD CONSTRAINT "portal_requests_status_check"
  CHECK ("status" IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'ready', 'converted'));

-- Notifications that asked for the removed step are no longer actionable.
DELETE FROM "notifications" WHERE "type" = 'price_update_request';