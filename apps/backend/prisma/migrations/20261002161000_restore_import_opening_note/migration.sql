-- The opening system note was removed by the previous migration and is back: the
-- timeline now says where an imported order came from before anything else
-- happens to it. The orders imported while it was gone get it written here so
-- they read the same as every order imported after this.
--
-- Only orders that do not already carry the sentence are touched, so re-running
-- this migration cannot double the opening of a conversation.
INSERT INTO "follow_up_notes" (
    id, request_id, author_id, author_name, author_role, source, visibility, message, created_at
)
SELECT
    gen_random_uuid()::text,
    request."id",
    NULL,
    'Portal',
    'system',
    'system',
    'customer',
    'Pesanan ini dibuat dari dokumen sistem ' || request."sap_doc_num" ||
        '. Statusnya mengikuti sistem secara otomatis.',
    request."created_at"
FROM "portal_requests" request
WHERE request."source" = 'sap'
  AND request."sap_doc_num" IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM "follow_up_notes" note
      WHERE note."request_id" = request."id"
        AND note."message" LIKE 'Pesanan ini dibuat dari dokumen sistem%'
  );