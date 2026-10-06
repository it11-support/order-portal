import { MetaData } from '../pagination'

export interface ApiResponse<T> {
  data: T[]
  meta: MetaData
}

/** Request kinds. Orders and inquiries are separate lists on both sides. */
export type RequestKind = 'order' | 'quote'

/** Notification kinds the portal produces. */
export type NotificationType =
  | 'new_order'
  | 'new_quote'
  | 'status_update'
  | 'followup_note'
  | 'price_increase'

/** Where a staff account's customers come from. */
export interface SalesPersonOption {
  slpCode: number
  slpName: string | null
}

/**
 * Where a notification should take the viewer.
 *
 * Orders and inquiries have separate pages, so the target depends on the
 * request's kind. Rows written before the split have no kind and fall back to
 * the orders list, which is where they were reachable from originally.
 *
 * Returns null when there is nothing to open, which is the case for price
 * changes: those point at a product, not a request.
 */
export const notificationTarget = (
  type: string,
  relatedId: string | null,
  kind: string | null,
  isCustomer: boolean,
): string | null => {
  if (!relatedId) return null
  // Price changes point at a product, not a request, so there is nothing to open.
  if (type === 'price_increase') return null

  const list = kind === 'quote' ? 'inquiries' : 'orders'
  // A customer has no /admin view, so every request-scoped notification lands
  // in their own detail page instead.
  const base = isCustomer ? '' : '/admin'
  return `${base}/${list}/${relatedId}`
}
