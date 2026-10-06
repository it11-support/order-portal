-- A portal order and its SAP document are two views of one thing.
--
--   * portal_requests.sap_* keeps the link to the ORDR plus the last SAP status
--     that was observed, so the customer can see the real delivery progress
--   * sales_orders.portal_ref carries the portal request id from the SAP
--     document, which lets an ORDR find its way home automatically

ALTER TABLE "portal_requests"
  ADD COLUMN "sap_company_id" VARCHAR(255),
  ADD COLUMN "sap_doc_entry" INTEGER,
  ADD COLUMN "sap_doc_num" INTEGER,
  ADD COLUMN "sap_doc_status" CHAR(1),
  ADD COLUMN "sap_canceled" CHAR(1),
  ADD COLUMN "sap_synced_at" TIMESTAMP(0);

CREATE INDEX "portal_requests_sap_doc_entry_idx" ON "portal_requests" ("sap_doc_entry");

ALTER TABLE "sales_orders" ADD COLUMN "portal_ref" VARCHAR(64);
CREATE INDEX "sales_orders_portal_ref_idx" ON "sales_orders" ("portal_ref");