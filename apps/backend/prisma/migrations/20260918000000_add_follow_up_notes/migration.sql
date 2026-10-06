CREATE TABLE "follow_up_notes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "request_id" TEXT NOT NULL REFERENCES "portal_requests"("id") ON DELETE CASCADE,
    "author_id" INTEGER NOT NULL REFERENCES "users"("id"),
    "author_name" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "follow_up_notes_request_id_created_at_idx" ON "follow_up_notes"("request_id", "created_at");
