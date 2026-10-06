-- The refined inquiry flow needs three more steps, so the status constraint that
-- was written for the original five values has to be replaced.
ALTER TABLE "portal_requests" DROP CONSTRAINT IF EXISTS "portal_requests_status_check";

ALTER TABLE "portal_requests"
  ADD CONSTRAINT "portal_requests_status_check"
  CHECK ("status" IN ('pending', 'confirmed', 'processing', 'delivered', 'cancelled', 'price_update', 'ready', 'converted'));