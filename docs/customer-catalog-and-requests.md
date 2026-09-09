# Customer catalog and requests

Customer catalog reads `sales_invoices` across all dates (first imported date:
2008-10-31). A purchase is a row with `canceled = 'N'`, `quantity > 0`, and a
matching ItemCode. Only currently active products are returned. The category
list contains active categories represented by those purchased products.

Suggested products are active items purchased by another customer with the same
current `IndustryC` subgroup, excluding every item previously purchased by the
signed-in customer. Customers without a subgroup receive no suggestions.
Retur/credit rows remain separate: a return does not erase an all-time purchase.
No other customer's identity, prices or invoices are sent to the catalog.

The sync is described in `integrations/order-portal-sync/README.md` and installed
in the sibling `order-portal-sync` project.

## Portal workflow

- Purchased items use the existing cart, then create a persisted `order` request.
- Suggested items use a separate quote selection and create a `quote` request.
  They do not enter the order cart.
- `POST /api/v1/requests` rechecks current activity, purchase history and subgroup
  eligibility on the server. Customer identity is resolved from authentication.
  Request UUIDs make retries idempotent; product snapshots come from the database.
- `GET /api/v1/requests` returns only the customer's requests. Admin and
  sales_admin can see all requests, customer contact details and follow-up notes.
- `PATCH /api/v1/requests/:id` is restricted to admin/sales_admin and enforces
  status transitions. Notes are visible to the customer as the sales follow-up.
- Quote stages: pending (waiting for sales), processing (follow-up), confirmed
  (price offered), delivered (finished), or cancelled. These are separate from
  order fulfillment despite sharing the existing status storage names.

Requests are persisted in PostgreSQL, not sample browser state. This does not
write a Sales Order or Sales Quotation into SAP. Sales staff must create any
formal SAP document after confirming the customer request and price.

## Validation

```sh
pnpm --filter backend exec tsx --test tests/customer-catalog.test.ts tests/customer-login.test.ts tests/request-access.test.ts
python integrations/order-portal-sync/test_invoices.py
pnpm --filter backend typecheck
pnpm --filter frontend build
```

The catalog integration test inserts isolated fixture records in the configured
portal database and cleans them up afterward; SAP is never modified.
