import { prisma } from '@/utils'
import { priceableCustomer } from './customer'
import { observeCustomerPrices } from './price-refresh'
import { round6, toNumber } from './utils'
import type { EffectivePrice, PriceableCustomer } from './types'
import { getCachedPriceList } from '../cache'

/**
 * Net price-list prices for a set of items.
 * Returns a map keyed by item code. Customers without a price list, and items
 * without a price entry, are simply absent from the map.
 */
export const resolvePriceListNet = async (
  customer: PriceableCustomer,
  itemCodes: string[],
  useCache = false,
): Promise<Map<string, EffectivePrice>> => {
  const resolved = new Map<string, EffectivePrice>()

  if (customer.priceListNum == null || !itemCodes.length) {
    return resolved
  }

  const priceList = useCache
    ? await getCachedPriceList(customer.priceListNum)
    : new Map(
      (
        await prisma.$queryRaw<
          {
            item_code: string
            price: string
            currency: string | null
          }[]
        >`
            SELECT DISTINCT ON (ip.item_code)
              ip.item_code,
              ip.price::text AS price,
              ip.currency
            FROM item_prices ip
            WHERE ip.list_num = ${customer.priceListNum}
              AND ip.item_code = ANY(${itemCodes}::varchar[])
              AND ip.price IS NOT NULL
            ORDER BY ip.item_code, ip.updated_at DESC
          `
      ).map((row) => [
        row.item_code,
        {
          price: row.price,
          currency: row.currency,
        },
      ]),
    )

  const discount = toNumber(customer.discountLevel) ?? 0
  const factor = 1 - discount / 100

  for (const itemCode of itemCodes) {
    const row = priceList.get(itemCode)

    if (!row) continue

    const listPrice = toNumber(row.price)

    if (listPrice === null) continue

    resolved.set(itemCode, {
      itemCode,
      price: round6(listPrice * factor),
      currency: row.currency ?? null,
      source: 'pricelist',
      discountApplied: discount,
    })
  }

  return resolved
}

/**
 * Committed actual prices, i.e. items this customer has bought before.
 */
export const actualPrices = async (
  customerId: bigint | string,
  itemCodes: string[],
): Promise<Map<string, EffectivePrice>> => {
  const resolved = new Map<string, EffectivePrice>()

  if (!itemCodes.length) return resolved

  const rows = await prisma.customerItemPrice.findMany({
    where: {
      customerId: BigInt(String(customerId)),
      itemCode: { in: itemCodes },
    },
    select: {
      itemCode: true,
      price: true,
      currency: true,
      discountApplied: true,
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
  if (!itemCodes.length) return new Map()

  const customer = await priceableCustomer(customerId)

  if (!customer) return new Map()

  return resolveEffectivePrices(customer, itemCodes)
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
  if (!itemCodes.length) return new Map()

  const customer = await priceableCustomer(customerId)

  if (!customer) return new Map()

  await observeCustomerPrices(customer, itemCodes)

  return resolveEffectivePrices(customer, itemCodes)
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

export const resolveEffectivePrices = async (
  customer: PriceableCustomer,
  itemCodes: string[],
  useCache = false,
): Promise<Map<string, EffectivePrice>> => {
  if (!itemCodes.length) return new Map()

  const resolved = await actualPrices(
    customer.id,
    itemCodes,
  )

  const missing = itemCodes.filter(
    (itemCode) => !resolved.has(itemCode),
  )

  if (missing.length) {
    const list = await resolvePriceListNet(
      customer,
      missing,
      useCache,
    )

    for (const [itemCode, value] of list) {
      resolved.set(itemCode, value)
    }
  }

  return resolved
}