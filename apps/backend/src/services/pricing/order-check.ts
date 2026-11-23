import { prisma } from '@/utils'
import { priceableCustomer } from './customer'
import { observeCustomerPrices } from './price-refresh'
import { effectivePrices } from './resolver'
import { round6, toNumber } from './utils'
import type { PendingPriceIncrease, EffectivePrice } from './types'

const productsForPriceItems = (
  items: Array<{ productId: string }>,
) =>
  prisma.product.findMany({
    where: {
      id: {
        in: items.map((item) => BigInt(item.productId)),
      },
    },
    select: {
      id: true,
      itemCode: true,
      itemName: true,
    },
  })


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
  const products = await productsForPriceItems(items)
  if (!products.length) return []

  // Observe and notify before deciding, so a customer who orders straight into
  // a price rise still receives the price-change notification.
  const customer = await priceableCustomer(cid)

  if (customer) {
    await observeCustomerPrices(
      customer,
      products.map((product) => product.itemCode),
    )
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

  const products = await productsForPriceItems(items)
  if (!products.length) return new Map()

  return effectivePrices(cid, [...new Set(products.map((product) => product.itemCode))])
}
