-- The portal never names the system it mirrors. Orders imported from a system
-- document were created as ORD-SAP-<docNum>, and that id is shown in the order
-- list, the detail header and every conversation link, so the prefix reached the
-- customer. ORD-DOC- says the same thing without naming the backend.
--
-- The id is a primary key that other tables point at by string, so the rename is
-- applied to every holder of the value, in one transaction: a half-renamed
-- request would leave notes and sales documents pointing at nothing.
-- 'ORD-SAP-' is eight characters, so the number starts at position nine.
UPDATE "portal_requests"
SET "id" = 'ORD-DOC-' || substring("id" from 9)
WHERE "id" LIKE 'ORD-SAP-%';

UPDATE "follow_up_notes"
SET "request_id" = 'ORD-DOC-' || substring("request_id" from 9)
WHERE "request_id" LIKE 'ORD-SAP-%';

UPDATE "sales_orders"
SET "portal_ref" = 'ORD-DOC-' || substring("portal_ref" from 9)
WHERE "portal_ref" LIKE 'ORD-SAP-%';

UPDATE "notifications"
SET "related_id" = 'ORD-DOC-' || substring("related_id" from 9)
WHERE "related_id" LIKE 'ORD-SAP-%';