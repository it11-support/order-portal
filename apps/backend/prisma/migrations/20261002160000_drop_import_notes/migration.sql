-- The import wrote its own bookkeeping into two places the customer reads as if
-- a person had put it there: the order's own note ("Catatan Customer") and the
-- opening system note in the timeline. Neither is information the customer asked
-- for, so the rows already written are removed rather than left differing from
-- every order imported after this.
UPDATE "portal_requests"
SET "notes" = ''
WHERE "source" = 'sap' AND "notes" LIKE 'Impor dari dokumen%';

DELETE FROM "follow_up_notes"
WHERE "source" = 'system' AND "message" LIKE 'Pesanan ini dibuat dari dokumen sistem%';