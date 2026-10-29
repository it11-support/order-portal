import { prisma } from '@utils'
import { normalizeItemCode } from '@/services/customer-catalog'
import type { CatalogProduct } from './catalog'

type PriceChangeRow = {
  item_code: string
  last_invoice_num: string | null
  last_invoice_date: Date | null
  last_invoice_price: unknown
  last_invoice_base_price: unknown
  current_price: unknown
  discount_applied: unknown
  discount_source: string | null
}

export type PriceChange = {
  lastInvoice: string | null
  lastInvoiceDate: string | null
  lastInvoicePrice: number | null
  lastInvoiceBasePrice: number | null
  currentPrice: number | null
  discountApplied: number | null
  discountSource: string | null
  priceDifference: number | null
  priceIncreasePercent: number | null
  priceIncreased: boolean
}

export const asFiniteNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}
const round2 = (value: number) => Math.round(value * 100) / 100

const calculateChange = (row: PriceChangeRow): PriceChange => {
  const currentPrice = asFiniteNumber(row.current_price)
  const lastInvoicePrice = asFiniteNumber(row.last_invoice_price)
  const lastInvoiceBasePrice = asFiniteNumber(row.last_invoice_base_price)

  const increased =
    currentPrice !== null &&
    lastInvoicePrice !== null &&
    lastInvoicePrice > 0 &&
    currentPrice > lastInvoicePrice

  const priceDifference = increased
    ? round2(currentPrice - lastInvoicePrice)
    : null

  const priceIncreasePercent =
    priceDifference !== null && lastInvoicePrice !== null
      ? round2((priceDifference / lastInvoicePrice) * 100)
      : null

  return {
    lastInvoice:
      row.last_invoice_num == null
        ? null
        : String(row.last_invoice_num),

    lastInvoiceDate: row.last_invoice_date
      ? new Date(row.last_invoice_date).toISOString().slice(0, 10)
      : null,

    lastInvoicePrice,
    lastInvoiceBasePrice,
    currentPrice,

    discountApplied: asFiniteNumber(row.discount_applied),
    discountSource: row.discount_source ?? 'none',

    priceDifference,
    priceIncreasePercent,
    priceIncreased: increased,
  }
}

export async function loadPriceChanges(customerId: bigint | null, products: CatalogProduct[]) {
  const changes = new Map<string, PriceChange>()
  if (!customerId || !products.length) return changes
  const itemCodes = [...new Set(products.map((product) => product.itemCode))]
  const rows = await prisma.$queryRaw<PriceChangeRow[]>`
    SELECT cip.item_code, cip.last_invoice_num, cip.last_invoice_date,
      cip.last_invoice_price, cip.last_invoice_base_price,
      cip.price AS current_price, cip.discount_applied, cip.discount_source
    FROM customer_item_prices cip
    WHERE cip.customer_id = ${customerId}
      AND cip.item_code = ANY(${itemCodes}::text[])
  `
  for (const row of rows) changes.set(normalizeItemCode(row.item_code), calculateChange(row))
  return changes
}
