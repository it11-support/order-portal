-- The free text the sales order carries in SAP. The sync copies the portal
-- reference in here, which makes the link auditable in both directions: the
-- document says which portal order it is, and the portal order keeps what the
-- document actually said.
ALTER TABLE "sales_orders"
ADD COLUMN "remarks" TEXT;