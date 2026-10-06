-- The previous wording pass replaced the lowercase "dokumen SAP", so a sentence that
-- starts with the capitalised "Dokumen SAP ..." kept naming the system. Both cases
-- are covered here rather than relying on a case-insensitive match, which Postgres
-- does not offer for replace().
UPDATE "notifications"
SET "title" = replace(replace("title", 'Dokumen SAP', 'Dokumen sistem'), 'dari dokumen SAP', 'dari dokumen sistem'),
    "message" = replace(replace("message", 'Dokumen SAP', 'Dokumen sistem'), 'dokumen SAP', 'dokumen sistem')
WHERE "title" LIKE '%Dokumen SAP%'
   OR "message" LIKE '%Dokumen SAP%'
   OR "message" LIKE '%dokumen SAP%';

UPDATE "portal_requests"
SET "notes" = replace(replace("notes", 'Dokumen SAP', 'Dokumen sistem'), 'dokumen SAP', 'dokumen sistem')
WHERE "notes" LIKE '%Dokumen SAP%' OR "notes" LIKE '%dokumen SAP%';

UPDATE "follow_up_notes"
SET "message" = replace(replace("message", 'Dokumen SAP', 'Dokumen sistem'), 'dokumen SAP', 'dokumen sistem')
WHERE "message" LIKE '%Dokumen SAP%' OR "message" LIKE '%dokumen SAP%';