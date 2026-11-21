import type { Actor } from './access'
import { RequestRow, RequestViews, SapView, SapViewData } from './types'

export const sapView = (row: RequestRow, views?: RequestViews): SapView | null => {
  if (row.sapDocEntry === null) return null

  const view: SapViewData = views?.get(row.id) ?? {
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

  const status: SapView['status'] = view.canceled ? 'canceled' : view.docStatus

  return {
    ...view,
    status,
  }
}

export const serialize = (row: RequestRow, views?: RequestViews, viewer?: Actor | null) => {
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
    status: views?.get(row.id)?.portalStatus ?? row.status,
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
