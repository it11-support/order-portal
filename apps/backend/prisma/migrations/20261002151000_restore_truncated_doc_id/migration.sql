-- The previous rename started at position ten instead of nine, so it cut the first
-- digit of every document number: ORD-SAP-626093713 became ORD-DOC-26093713.
-- The number itself is not lost, it is still in sales_orders.doc_num, so the ids
-- are rebuilt from that rather than guessed from the truncated string.
--
-- The mapping is read into a temporary table first: sales_orders is rewritten in
-- the same transaction, and the portal side still has to match the old value
-- while it is being updated.
CREATE TEMP TABLE doc_id_fix AS
SELECT "portal_ref" AS "old_id", 'ORD-DOC-' || "doc_num"::text AS "new_id"
FROM "sales_orders"
WHERE "portal_ref" LIKE 'ORD-DOC-%' AND "portal_ref" <> 'ORD-DOC-' || "doc_num"::text;

-- The parent row moves first: follow_up_notes holds a real foreign key onto
-- portal_requests, so a child cannot point at an id that does not exist yet.
UPDATE "portal_requests"
SET "id" = fix."new_id"
FROM doc_id_fix fix
WHERE "portal_requests"."id" = fix."old_id";

UPDATE "follow_up_notes"
SET "request_id" = fix."new_id"
FROM doc_id_fix fix
WHERE "follow_up_notes"."request_id" = fix."old_id";

UPDATE "notifications"
SET "related_id" = fix."new_id"
FROM doc_id_fix fix
WHERE "notifications"."related_id" = fix."old_id";

UPDATE "sales_orders"
SET "portal_ref" = fix."new_id"
FROM doc_id_fix fix
WHERE "sales_orders"."portal_ref" = fix."old_id";

DROP TABLE doc_id_fix;