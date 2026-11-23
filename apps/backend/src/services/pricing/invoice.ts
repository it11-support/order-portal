import { prisma } from '@/utils'
import { toNumber, round6 } from './utils'
import type { InvoicePriceRow } from './types'

/**
 * The last invoice line per item for one customer.
 *
 * LineTotal is net of the line discount and excludes VAT, which makes
 * LineTotal/Quantity the amount the customer really paid per unit. The
 * price-before-discount columns are only used when a synced line has no total.
 */
export const resolveInvoicePrices = async (
  cardCode: string,
  itemCodes: string[],
): Promise<Map<string, InvoicePriceRow & { unitPrice: number }>> => {
  const resolved = new Map<string, InvoicePriceRow & { unitPrice: number }>()
  if (!itemCodes.length) return resolved

  const rows = await prisma.$queryRaw<InvoicePriceRow[]>`
    SELECT DISTINCT ON (si.item_code)
      si.item_code, si.line_total, si.price_bef_disc, si.disc_line,
      si.quantity, si.currency, si.doc_date, si.doc_entry, si.line_num
    FROM sales_invoices si
    WHERE si.card_code = ${cardCode}
      AND si.canceled = 'N'
      AND si.quantity > 0
      AND si.item_code = ANY(${itemCodes}::varchar[])
    ORDER BY si.item_code, si.doc_date DESC, si.doc_entry DESC, si.line_num DESC
  `

  for (const row of rows) {
    const quantity = toNumber(row.quantity)
    if (quantity === null || quantity <= 0) continue

    const total = row.line_total !== null ? toNumber(row.line_total) : null
    if (total !== null) {
      resolved.set(row.item_code, { ...row, unitPrice: round6(total / quantity) })
      continue
    }
    const before = toNumber(row.price_bef_disc)
    if (before === null) continue
    const discount = toNumber(row.disc_line) ?? 0
    resolved.set(row.item_code, { ...row, unitPrice: round6(before * (1 - discount / 100)) })
  }
  return resolved
}

export const invoiceRef = (row: InvoicePriceRow) =>
  row.doc_entry === null ? null : `INV ${row.doc_entry}/${row.line_num ?? 0}`
