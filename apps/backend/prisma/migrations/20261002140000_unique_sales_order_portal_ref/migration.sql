-- One SAP document belongs to one portal order. A duplicate reference would make
-- the portal mirror the same document onto two different customers' orders, so
-- the database refuses it rather than leaving it to whoever notices first.
-- Postgres allows many NULLs, which is what unlinked documents need.
CREATE UNIQUE INDEX "sales_orders_portal_ref_key" ON "sales_orders"("portal_ref");