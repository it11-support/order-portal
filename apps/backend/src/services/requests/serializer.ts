import type { Actor } from './access'

/**
 * How a portal request stands in the system, for the UI.
 *
 * Once a request is linked to a document, the customer follows that document
 * rather than an internal guess: "Open" means the document is still being worked
 * on, "Closed" means it is finished, "Canceled" means it will not happen.
 */
export const sapView = (row: any, views?: Map<string, any>) => {
  if (!row.sapDocEntry) return null
  const view = views?.get(row.id) ?? {
    companyId: row.sapCompanyId,
    docEntry: row.sapDocEntry,
    docNum: row.sapDocNum,
    docStatus:
      row.sapDocStatus?.trim() === 'C'
        ? 'closed'
        : row.sapDocStatus?.trim() === 'O'
          ? 'open'
          : 'unknown',
    canceled: row.sapCanceled?.trim() === 'Y',
    syncedAt: row.sapSyncedAt?.toISOString() ?? null,
  }
  return {
    ...view,
    status:
      view.canceled ? 'canceled' : view.docStatus === 'closed' ? 'closed' : view.docStatus === 'open' ? 'open' : 'unknown',
  }
}

/**
 * The customer's side of a request.
 *
 * A viewer is required so staff-only fields can be dropped instead of merely
 * hidden by the UI: the payload the customer receives must not carry them at
 * all, otherwise the internal note is one devtools tab away.
 */
export const serialize = (row: any, views?: Map<string, any>, viewer?: Actor | null) => {
  const forCustomer = viewer?.role === 'customer'
  return {
    id: row.id,
    kind: row.kind,
    userId: String(row.customerId),
    userName: row.customer.CntctPrsn || row.customer.CardName,
    company: row.customer.CardName,
    cardCode: row.customer.CardCode,
    phone: row.customer.Cellular || row.customer.Phone1,
    salesName: row.customer.SalesName,
    items: row.items,
    // Reconciling against SAP can move the status during this very read, so the
    // value the caller sees is the reconciled one, not the row we read a moment ago.
    status: views?.get(row.id)?.portalStatus ?? row.status,
    // customer | sales: who raised it. A sales-entered order has to look
    // different from the customer's own, otherwise the customer is surprised by
    // an order they did not place.
    source: row.source ?? 'customer',
    createdByName: row.createdBy?.name ?? null,
    priceBasis: row.priceBasis ?? null,
    inquiryId: row.inquiryId ?? null,
    convertedOrderId: row.convertedOrderId ?? null,
    sap: sapView(row, views),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    notes: row.notes,
    ...(forCustomer ? {} : { salesNotes: row.salesNotes ?? null }),
  }
}
