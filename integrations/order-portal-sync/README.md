# SAP invoice sync

These files extend `D:/Projects/TSM/order-portal-sync` and reuse its existing
`jobs/base_sync.py`, `.env`, Python requirements, and Docker setup.

## Mapping

- `sales_invoices`: SAP `OINV` header joined to `INV1` on `DocEntry`.
- `retur_invoices`: SAP `ORIN` header joined to `RIN1` on `DocEntry` (A/R credit
  memos, not physical goods-return documents `ORDN/RDN1`).
- PostgreSQL uses snake_case; Prisma exposes camelCase fields.
- Each row is unique on `(company_id, doc_entry, line_num)`. `DocNum` is stored
  for display; it is not used as the internal document identity.
- `company_id` is `SAP_COMPANY_ID`, falling back to `MSSQL_DATABASE`. Keep it
  stable. Existing customer/product master jobs support one SAP company per
  portal; do not combine master data from different companies without extending
  customer/product keys too.
- `quantity` is SAP document quantity; the installed SAP schema has no `InvQty`.
  `inventory_quantity` uses `Quantity` when `UseBaseUn = 'Y'`, otherwise
  `Quantity * NumPerMsr` (falling back to 1 for a missing/zero factor).
  `qty_kg` is only populated when the inventory or document unit explicitly is
  KG/KGS/KILOGRAM. Other units require an agreed conversion and remain NULL.
- `price_bef_disc` is `PriceBefDi`; `disc_line` and `disc_total` are percentages.
  `line_total` is SAP `LineTotal` in local currency; `total_sales` is
  `LineTotal * (1 - header DiscPrcnt / 100)`, before tax/freight/rounding.
  `currency` describes the SAP line price currency, which may differ from the
  local currency used by LineTotal. These values are not a posted ledger total.
- Credit quantities/amounts retain their SAP sign. Subtract credit values from
  invoices for net-sales reporting; do not negate them twice.
- `base_type`, `base_entry`, `base_line` preserve credit memo links to invoices.
- `canceled` preserves N/Y/C including cancellation documents. Purchase-history
  queries must use `canceled = 'N'`, nonempty ItemCode and positive quantity.
  A later return does not erase the fact that a customer purchased an item;
  returns remain available separately for net-sales analysis.
- `dwh_created_at` / `dwh_updated_at` are source document dates, not portal dates.

## Execution

Apply portal Prisma migrations before starting the new jobs. The first run reads
all dates, in batches of 2,000. Later runs read headers created/updated since the
last successful source watermark minus a two-day overlap. Cancellations are
included, so previously synced rows become ineligible for purchase history.
Rows and the checkpoint commit together. Errors roll back the complete job.
The scheduler runs all five jobs, independently, then sleeps 600 seconds.

From the sync directory, with the existing environment loaded:

```sh
python -m jobs.sales_invoices
python -m jobs.retur_invoices
```

For a full re-read, including historical line/unit changes whose header timestamp
was not updated:

```sh
python -m jobs.sales_invoices --full
python -m jobs.retur_invoices --full
```

Optional environment variables: `SAP_COMPANY_ID`, `INVOICE_BATCH_SIZE` (1–10000,
default 2000), `INVOICE_OVERLAP_DAYS` (at least 1, default 2).

Restart the existing scheduler to load changed Python modules; a bind mount alone
does not reload an already running Python process. The jobs never write to SAP.

SAP references:

- https://help.sap.com/doc/089315d8d0f8475a9fc84fb919b501a3/10.0/en-US/SDKHelp/OINV.html
- https://help.sap.com/doc/089315d8d0f8475a9fc84fb919b501a3/10.0/en-US/SDKHelp/INV1.html
