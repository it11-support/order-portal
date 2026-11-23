import { Decimal } from '@/generated/prisma/internal/prismaNamespace'
import { prisma } from '@/utils'
import { announcePriceChanges } from '@/services/price-alerts'
import { resolveInvoicePrices, invoiceRef } from './invoice'
import { round6, toNumber } from './utils'
import type { InvoicePriceRow, PriceMovement, PriceableCustomer } from './types'

/**
 * Refreshes the CustomerItemPrice cache from the synced invoices and records any
 * movement it observes.
 *
 * The first observation of an item only seeds the cache. Every later change
 * appends a PriceChangeLog row so increases are auditable and can be surfaced
 * to the customer and to the inquiries waiting on a price. A cached row whose
 * invoice is no longer there is removed, so a row only ever exists for an item
 * this customer has actually bought.
 *
 * Returns the movements detected during this call.
 */
type InvoicePriceMap = Awaited<ReturnType<typeof resolveInvoicePrices>>
type ResolvedInvoiceRow = InvoicePriceRow & { unitPrice: number }
type CachedPriceRow = {
  itemCode: string
  price: Decimal
  lastInvoicePrice: Decimal | null
}
const removeStaleCustomerPrices = async (
  customerId: bigint,
  existing: CachedPriceRow[],
  invoice: InvoicePriceMap,
): Promise<Map<string, number | null>> => {
  const stale = existing.filter((row) => !invoice.has(row.itemCode)).map((row) => row.itemCode)

  if (stale.length) {
    await prisma.customerItemPrice.deleteMany({
      where: { customerId, itemCode: { in: stale } },
    })
  }

  return new Map(
    existing
      .filter((row) => invoice.has(row.itemCode))
      .map((row) => [
        row.itemCode,
        toNumber(row.lastInvoicePrice ?? row.price),
      ] as const),
  )
}

const saveCustomerInvoicePrice = async (
  customerId: bigint,
  itemCode: string,
  row: ResolvedInvoiceRow,
  value: number,
  now: Date,
): Promise<void> => {
  await prisma.customerItemPrice.upsert({
    where: {
      customerId_itemCode: {
        customerId,
        itemCode,
      },
    },
    create: {
      customerId,
      itemCode,
      price: new Decimal(value),
      currency: row.currency ?? null,
      discountApplied: new Decimal(0),
      source: 'invoice',
      sourceDoc: invoiceRef(row),
      lastInvoicePrice: new Decimal(value),
      lastInvoiceDate: row.doc_date ?? null,
      lastChangedAt: now,
      lastPurchasedAt: row.doc_date ?? null,
      updatedAt: now,
    },
    update: {
      // Do not overwrite SAP master price or source.
      lastInvoicePrice: new Decimal(value),
      lastInvoiceDate: row.doc_date ?? null,
      lastPurchasedAt: row.doc_date ?? null,
      updatedAt: now,
    },
  })
}

const recordCustomerPriceMovement = async (
  customerId: bigint,
  itemCode: string,
  row: ResolvedInvoiceRow,
  oldPrice: number,
  newPrice: number,
  itemName?: string,
): Promise<PriceMovement> => {
  const changePct = oldPrice === 0 ? 0 : round6(((newPrice - oldPrice) / oldPrice) * 100)
  const direction: PriceMovement['direction'] = changePct > 0 ? 'up' : 'down'

  await prisma.priceChangeLog.create({
    data: {
      customerId,
      itemCode,
      oldPrice: new Decimal(oldPrice),
      newPrice: new Decimal(newPrice),
      changePct: new Decimal(changePct),
      direction,
    },
  })

  return {
    itemCode,
    itemName,
    oldPrice,
    newPrice,
    changePct,
    direction,
    currency: row.currency ?? null,
    sourceDoc: invoiceRef(row),
  }
}

const refreshOneCustomerPrice = async (
  customerId: bigint,
  itemCode: string,
  row: ResolvedInvoiceRow,
  previous: Map<string, number | null>,
  names: Map<string, string>,
  now: Date,
): Promise<PriceMovement | null> => {
  const value = round6(row.unitPrice)
  const oldPrice = previous.has(itemCode) ? (previous.get(itemCode) ?? null) : null

  // Unchanged prices must not write on catalog reads.
  if (oldPrice !== null && oldPrice === value) return null

  await saveCustomerInvoicePrice(customerId, itemCode, row, value, now)

  // First observation seeds the cache without generating a movement log.
  if (oldPrice === null) return null

  return recordCustomerPriceMovement(
    customerId,
    itemCode,
    row,
    oldPrice,
    value,
    names.get(itemCode),
  )
}

export const refreshCustomerPrices = async (
  customer: { id: bigint; CardCode: string | null },
  itemCodes: string[],
): Promise<PriceMovement[]> => {
  if (!customer.CardCode || !itemCodes.length) return []

  const invoice = await resolveInvoicePrices(customer.CardCode, itemCodes)
  const existing = await prisma.customerItemPrice.findMany({
    where: {
      customerId: customer.id,
      itemCode: { in: itemCodes },
    },
    select: {
      itemCode: true,
      price: true,
      lastInvoicePrice: true,
    },
  })
  const previous = await removeStaleCustomerPrices(customer.id, existing, invoice)
  if (!invoice.size) return []

  const names = await productNames([...invoice.keys()])
  const now = new Date()
  const movements: PriceMovement[] = []

  for (const [itemCode, row] of invoice) {
    const movement = await refreshOneCustomerPrice(customer.id, itemCode, row, previous, names, now)
    if (movement) movements.push(movement)
  }

  return movements
}

export const productNames = async (itemCodes: string[]) => {
  if (!itemCodes.length) return new Map<string, string>()
  const rows = await prisma.product.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { itemCode: true, itemName: true },
  })
  return new Map(rows.map((row) => [row.itemCode, row.itemName]))
}

export const observeCustomerPrices = async (
  customer: PriceableCustomer,
  itemCodes: string[],
): Promise<void> => {
  const movements = await refreshCustomerPrices(customer, itemCodes)

  if (movements.length) {
    await announcePriceChanges(customer.id, movements)
  }
}
