import { Decimal } from '@/generated/prisma/internal/prismaNamespace'
import { prisma } from '@/utils'
import { announcePriceChanges } from '@/services/price-alerts'

/**
 * Two prices exist for every item, and which one applies depends on whether the
 * customer has ever bought it.
 *
 *   * "harga aktual" — the net unit price on their most recent invoice line.
 *     It already carries whatever discount was negotiated, so a repeat order is
 *     simply ordered at this price and needs no gate.
 *   * "harga price list" — ITM1 price for the customer's price list after
 *     OCRD.Discount. This is what a customer who has never bought the item
 *     sees, and what an inquiry is quoted at.
 *
 * The two meet in CustomerItemPrice: a row exists only for an item the customer
 * has actually purchased, so its presence is what makes an item a repeat item.
 * Price movement is therefore observed against the actual price, and the
 * price-list figure is always computed live because nothing is committed to it.
 */

export const PRICE_INCREASE_ALERT_PERCENT = 3

export type PriceSource = 'actual' | 'pricelist'

export interface EffectivePrice {
  itemCode: string
  price: number
  currency: string | null
  source: PriceSource
  discountApplied: number
}

export interface InvoicePriceRow {
  item_code: string
  line_total: string | null
  price_bef_disc: string | null
  disc_line: string | null
  quantity: string | null
  currency: string | null
  doc_date: Date | null
  doc_entry: number | null
  line_num: number | null
}

type DecimalLike = {
  toNumber: () => number
}

const isDecimalLike = (value: unknown): value is DecimalLike =>
  value !== null &&
  typeof value === 'object' &&
  'toNumber' in value &&
  typeof value.toNumber === 'function'

const toNumber = (value: unknown): number | null => {
  if (value === null || value === undefined) return null

  if (isDecimalLike(value)) {
    const result = value.toNumber()
    return Number.isFinite(result) ? result : null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const result = Number(value)
    return Number.isFinite(result) ? result : null
  }

  throw new TypeError(
    `Invalid price value: ${Object.prototype.toString.call(value)}`,
  )
}

const round6 = (value: number) => new Decimal(value).toDecimalPlaces(6).toNumber()

const formatPrice = (value: number, currency: string | null) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 2,
  }).format(value)

interface PriceableCustomer {
  id: bigint
  CardCode: string | null
  priceListNum: number | null
  discountLevel: unknown
}

/**
 * Reads the customer master fields the price resolver depends on. Kept
 * separate from currentCustomer() so the catalog and the order gate share one
 * definition of "which price list does this customer buy at".
 *
 * The Prisma client extension stringifies BigInt on every read, so the id is
 * normalised back to BigInt here. Callers may pass a string or a BigInt.
 */
export const priceableCustomer = async (customerId: bigint | string): Promise<PriceableCustomer | null> => {
  const row = await prisma.customers.findUnique({
    where: { id: BigInt(String(customerId)) },
    select: { id: true, CardCode: true, priceListNum: true, discountLevel: true },
  })
  if (!row) return null
  return {
    id: BigInt(String(row.id)),
    CardCode: row.CardCode,
    priceListNum: row.priceListNum,
    discountLevel: row.discountLevel,
  }
}

/**
 * Net price-list prices for a set of items.
 * Returns a map keyed by item code. Customers without a price list, and items
 * without a price entry, are simply absent from the map.
 */
export const resolvePriceListNet = async (
  customer: PriceableCustomer,
  itemCodes: string[],
): Promise<Map<string, EffectivePrice>> => {
  const resolved = new Map<string, EffectivePrice>()
  if (customer.priceListNum == null || !itemCodes.length) return resolved

  const rows = await prisma.$queryRaw<
    { item_code: string; price: string | null; currency: string | null }[]
  >`
    SELECT DISTINCT ON (ip.item_code)
      ip.item_code, ip.price, ip.currency
    FROM item_prices ip
    WHERE ip.list_num = ${customer.priceListNum}
      AND ip.item_code = ANY(${itemCodes}::varchar[])
      AND ip.price IS NOT NULL
    ORDER BY ip.item_code, ip.updated_at DESC
  `

  const discount = toNumber(customer.discountLevel) ?? 0
  const factor = 1 - discount / 100

  for (const row of rows) {
    const listPrice = toNumber(row.price)
    if (listPrice === null) continue
    resolved.set(row.item_code, {
      itemCode: row.item_code,
      price: round6(listPrice * factor),
      currency: row.currency ?? null,
      source: 'pricelist',
      discountApplied: discount,
    })
  }
  return resolved
}

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

/**
 * One row per observed price movement. Rows are the audit trail behind the
 * customer-facing "harga naik" notification, the order confirmation gate, and
 * the notice dropped into open inquiries.
 */
export interface PriceMovement {
  itemCode: string
  itemName?: string
  oldPrice: number | null
  newPrice: number
  changePct: number
  direction: 'up' | 'down'
  currency: string | null
  sourceDoc: string | null
}

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
type CachedPriceRow = { itemCode: string; price: Decimal }

const removeStaleCustomerPrices = async (
  customerId: bigint,
  existing: CachedPriceRow[],
  invoice: InvoicePriceMap,
): Promise<Map<string, number | null>> => {
  const stale = existing
    .filter((row) => !invoice.has(row.itemCode))
    .map((row) => row.itemCode)

  if (stale.length) {
    await prisma.customerItemPrice.deleteMany({
      where: { customerId, itemCode: { in: stale } },
    })
  }

  return new Map(
    existing
      .filter((row) => invoice.has(row.itemCode))
      .map((row) => [row.itemCode, toNumber(row.price)]),
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
  const changePct = oldPrice === 0
    ? 0
    : round6(((newPrice - oldPrice) / oldPrice) * 100)
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
  const oldPrice = previous.has(itemCode) ? previous.get(itemCode) ?? null : null

  // Unchanged prices must not write on catalog reads.
  if (oldPrice !== null && oldPrice === value) return null

  await saveCustomerInvoicePrice(customerId, itemCode, row, value, now)

  // First observation seeds the cache without generating a movement log.
  if (oldPrice === null) return null

  return recordCustomerPriceMovement(
    customerId, itemCode, row, oldPrice, value, names.get(itemCode),
  )
}

export const refreshCustomerPrices = async (
  customer: { id: bigint; CardCode: string | null },
  itemCodes: string[],
): Promise<PriceMovement[]> => {
  if (!customer.CardCode || !itemCodes.length) return []

  const invoice = await resolveInvoicePrices(customer.CardCode, itemCodes)
  const existing = await prisma.customerItemPrice.findMany({
    where: { customerId: customer.id, itemCode: { in: itemCodes } },
    select: { itemCode: true, price: true },
  })
  const previous = await removeStaleCustomerPrices(customer.id, existing, invoice)
  if (!invoice.size) return []

  const names = await productNames([...invoice.keys()])
  const now = new Date()
  const movements: PriceMovement[] = []

  for (const [itemCode, row] of invoice) {
    const movement = await refreshOneCustomerPrice(
      customer.id, itemCode, row, previous, names, now,
    )
    if (movement) movements.push(movement)
  }

  return movements
}

const invoiceRef = (row: InvoicePriceRow) =>
  row.doc_entry === null ? null : `INV ${row.doc_entry}/${row.line_num ?? 0}`

const productNames = async (itemCodes: string[]) => {
  if (!itemCodes.length) return new Map<string, string>()
  const rows = await prisma.product.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { itemCode: true, itemName: true },
  })
  return new Map(rows.map((row) => [row.itemCode, row.itemName]))
}

/**
 * Committed actual prices, i.e. items this customer has bought before.
 */
export const actualPrices = async (
  customerId: bigint | string,
  itemCodes: string[],
): Promise<Map<string, EffectivePrice>> => {
  const cid = BigInt(String(customerId))
  const resolved = new Map<string, EffectivePrice>()
  if (!itemCodes.length) return resolved
  const rows = await prisma.customerItemPrice.findMany({
    where: { customerId: cid, itemCode: { in: itemCodes } },
    select: {
      itemCode: true,
      price: true,
      currency: true,
      discountApplied: true,
      source: true,
    },
  })
  for (const row of rows) {
    const price = toNumber(row.price)
    if (price === null) continue
    resolved.set(row.itemCode, {
      itemCode: row.itemCode,
      price,
      currency: row.currency ?? null,
      source: 'actual',
      discountApplied: toNumber(row.discountApplied) ?? 0,
    })
  }
  return resolved
}

/**
 * The price that applies to a set of items for this customer right now.
 *
 * Repeat items keep their actual invoice price. Anything the customer has never
 * bought falls back to the price list, which is the figure an inquiry is quoted
 * at and the figure they may order at without any negotiation.
 */
export const effectivePrices = async (
  customerId: bigint | string,
  itemCodes: string[],
): Promise<Map<string, EffectivePrice>> => {
  const cid = BigInt(String(customerId))
  const customer = await priceableCustomer(cid)
  if (!customer || !itemCodes.length) return new Map()

  const resolved = new Map(await actualPrices(cid, itemCodes))
  const missing = itemCodes.filter((itemCode) => !resolved.has(itemCode))
  if (missing.length) {
    const list = await resolvePriceListNet(customer, missing)
    for (const [itemCode, value] of list) resolved.set(itemCode, value)
  }
  return resolved
}

/**
 * Resolves prices for a customer's catalog page and observes movement.
 *
 * Called on read because the catalog is the earliest point where a stale
 * customer would act on an old price. Detection is idempotent: an unchanged
 * price writes nothing and produces no notification.
 *
 * Returns a map keyed by item code. Items without any price are absent, and the
 * caller renders them as "Harga tersedia upon request".
 */
export const pricesForCatalog = async (
  customerId: bigint | string,
  itemCodes: string[],
): Promise<Map<string, EffectivePrice>> => {
  const cid = BigInt(String(customerId))
  const customer = await priceableCustomer(cid)
  if (!customer || !itemCodes.length) return new Map()

  const movements = await refreshCustomerPrices(customer, itemCodes)
  if (movements.length) await announcePriceChanges(cid, movements)

  return effectivePrices(cid, itemCodes)
}

/**
 * Whether every item of an inquiry now carries a price of its own.
 *
 * The price list is the figure anybody can read; a price beyond it exists only
 * once the item has been priced for this customer. That is exactly what an
 * inquiry is waiting for. Until every line resolves to an actual price, the
 * number on screen is still the generic one and must not be sold, so an
 * incomplete set of items keeps the whole inquiry closed: half a price list and
 * half a negotiated price is not a quote.
 */
export const hasNegotiatedPrices = async (
  customerId: bigint | string,
  itemCodes: string[],
): Promise<boolean> => {
  const wanted = [...new Set(itemCodes)]
  if (!wanted.length) return false

  const resolved = await effectivePrices(customerId, wanted)
  return wanted.every((itemCode) => resolved.get(itemCode)?.source === 'actual')
}

export interface PendingPriceIncrease {
  productId: string
  itemCode: string
  itemName: string
  oldPrice: number
  newPrice: number
  changePct: number
  currency: string | null
}

/**
 * Order-time gate.
 *
 * Compares the price the customer was last shown (sent by the browser, since
 * that is what they actually agreed to) against the price the portal resolves
 * right now. Only upward movements are returned, so an unchanged or reduced
 * price never blocks the order.
 *
 * A missing or non-numeric quoted price is treated as "not yet seen" and does
 * not block: the order proceeds at the current price, which is the same
 * behaviour as a first-time purchase.
 */
export const priceIncreaseCheck = async (
  customerId: bigint | string,
  items: Array<{ productId: string; price?: unknown }>,
): Promise<PendingPriceIncrease[]> => {
  if (!items.length) return []

  const cid = BigInt(String(customerId))
  const productIds = items.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds.map((id) => BigInt(id)) } },
    select: { id: true, itemCode: true, itemName: true },
  })
  if (!products.length) return []

  // Observe and notify before deciding, so a customer who orders straight into
  // a price rise still receives the price-change notification.
  const customer = await priceableCustomer(cid)
  if (customer) {
    const movements = await refreshCustomerPrices(
      customer,
      products.map((product) => product.itemCode),
    )
    if (movements.length) await announcePriceChanges(cid, movements)
  }

  const net = await effectivePrices(
    cid,
    products.map((product) => product.itemCode),
  )

  const byProductId = new Map(products.map((product) => [String(product.id), product]))
  const pending: PendingPriceIncrease[] = []

  for (const item of items) {
    const product = byProductId.get(String(item.productId))
    if (!product) continue

    const current = net.get(product.itemCode)
    if (!current) continue

    const quoted = toNumber(item.price)
    if (quoted === null) continue

    // Never block on a price that went down; execute at the better price.
    if (current.price <= quoted) continue

    const changePct = quoted === 0 ? 100 : round6(((current.price - quoted) / quoted) * 100)
    pending.push({
      productId: String(product.id),
      itemCode: product.itemCode,
      itemName: product.itemName,
      oldPrice: quoted,
      newPrice: current.price,
      changePct,
      currency: current.currency,
    })
  }

  return pending
}

/**
 * Current price per item for the products named in an order payload.
 * Unlike pricesForCatalog this performs no change detection; the caller has
 * already run priceIncreaseCheck for this same payload.
 */
export const pricesForItems = async (
  customerId: bigint | string,
  items: Array<{ productId: string }>,
): Promise<Map<string, EffectivePrice>> => {
  const cid = BigInt(String(customerId))
  if (!items.length) return new Map()

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((item) => BigInt(item.productId)) } },
    select: { id: true, itemCode: true },
  })
  if (!products.length) return new Map()

  return effectivePrices(
    cid,
    [...new Set(products.map((product) => product.itemCode))],
  )
}

export { formatPrice, round6, toNumber, productNames }