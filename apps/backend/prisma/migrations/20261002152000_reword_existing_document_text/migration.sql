-- Wording written before the system was described as "sistem" is stored in the
-- order's own notes and in the notification titles that were sent for it. The
-- code only changes new rows, so the text already shown to a customer is fixed
-- here rather than left reading differently from every later order.
UPDATE "portal_requests"
SET "notes" = replace(replace("notes", 'Impor dari dokumen SAP', 'Impor dari dokumen sistem'), 'Catatan SAP:', 'Catatan sistem:')
WHERE "notes" LIKE '%dokumen SAP%' OR "notes" LIKE '%Catatan SAP:%';

UPDATE "notifications"
SET "title" = replace(replace(replace("title", 'ORD-SAP-', 'ORD-DOC-'), 'dokumen SAP', 'dokumen sistem'), 'di SAP', 'di sistem'),
    "message" = replace(replace(replace(replace(replace("message", 'ORD-SAP-', 'ORD-DOC-'), 'dokumen SAP', 'dokumen sistem'), 'dari SAP', 'dari sistem'), 'mengikuti SAP', 'mengikuti sistem'), 'RDR1 belum tersinkron', 'data detail belum tersinkron')
WHERE "title" LIKE '%SAP%' OR "message" LIKE '%SAP%' OR "message" LIKE '%RDR1%';

UPDATE "follow_up_notes"
SET "message" = replace(replace(replace("message", 'dokumen SAP', 'dokumen sistem'), 'mengikuti SAP', 'mengikuti sistem'), 'RDR1 belum tersinkron', 'data detail belum tersinkron')
WHERE "message" LIKE '%SAP%' OR "message" LIKE '%RDR1%';

UPDATE "follow_up_notes"
SET "author_name" = 'Portal'
WHERE "author_name" = 'SAP';