import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import type { Actor } from './access'
import { prisma } from '@/utils'
import { customerPurchasedProductFilter } from '@/services/customer-catalog'
import { priceIncreaseCheck, priceableCustomer, pricesForItems, refreshCustomerPrices, round6 } from '@/services/pricing'

// Keep the original server-resolved snapshot rules when editing a draft.
export const prepareDraftItems = async (
  row: any, items: any[], data: any, res: Response,
): Promise<any[] | null> => {
  let nextItems: any[] | null = null
  if (items !== undefined) {
    const ids = items.map((i: any) => BigInt(String(i.productId)))

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
    })

    if (products.length !== ids.length) {
      res.status(400).json({
        message: 'Produk tidak ditemukan atau tidak aktif.',
      })
      return null
    }

    const oldItems = Array.isArray(row.items)
      ? (row.items as any[])
      : []

    const oldById = new Map(
      oldItems.map((item) => [
        String(item.product?.id ?? item.productId),
        item,
      ]),
    )

    const customerForPrices = await priceableCustomer(row.customerId)

    if (customerForPrices) {
      await refreshCustomerPrices(
        customerForPrices,
        [...new Set(products.map((p) => p.itemCode))],
      )
    }

    const currentPrices = await pricesForItems(row.customerId, items)

    nextItems = items.map((item: any) => {
      const product = products.find(
        (p) => String(p.id) === String(item.productId),
      )!

      const previous = oldById.get(String(product.id))
      const current = currentPrices.get(product.itemCode)

      // Existing items retain their original reference price.
      // New items receive a server-resolved reference price.
      const price = previous?.price ?? current?.price ?? null
      const currency = previous?.currency ?? current?.currency ?? null
      const priceSource =
        previous?.priceSource ?? current?.source ?? null

      return {
        product,
        qty: item.qty,
        ...(price !== null
          ? {
            price,
            currency,
            priceSource,
            lineTotal: round6(item.qty * price),
          }
          : {}),
      }
    })

    data.items = JSON.parse(JSON.stringify(nextItems))
  }
  return nextItems
}

// Revalidate all products and prices before a draft becomes pending.
export const prepareDraftSubmission = async (
  req: AuthenticatedRequest, res: Response, row: any, actor: Actor,
  effectiveStatus: string, nextItems: any[] | null, priceAccepted: boolean, data: any,
): Promise<boolean> => {
  if (row.status === 'draft' && effectiveStatus === 'pending') {
    const raw = nextItems ?? (Array.isArray(row.items) ? row.items as any[] : [])
    const normalized = raw.map((i: any) => ({
      productId: String(i.product?.id ?? i.productId ?? ''),
      qty: i.qty,
      price: i.price ?? i.acceptedPrice ?? null,
    }))
    if (!normalized.length || normalized.some((i) => !/^\d+$/.test(i.productId) || !Number.isSafeInteger(i.qty) || i.qty < 1 || i.qty > 100000))
      { res.status(400).json({ message: 'Item draft tidak valid.' }); return false }
    const ids = normalized.map((i) => BigInt(i.productId))
    if (new Set(ids.map(String)).size !== ids.length)
      { res.status(400).json({ message: 'Produk duplikat.' }); return false }
    const products = await prisma.product.findMany({ where: { id: { in: ids }, isActive: true } })
    if (products.length !== ids.length)
      { res.status(400).json({ message: 'Produk tidak aktif.' }); return false }
    if (actor.role === 'customer') {
      const allowed = await customerPurchasedProductFilter(req)
      const allowedProducts = await prisma.product.findMany({ where: { ...allowed, id: { in: ids } }, select: { id: true } })
      if (allowedProducts.length !== ids.length)
        { res.status(403).json({ message: 'Draft berisi produk yang tidak dapat dipesan customer. Hubungi sales.' }); return false }
      const changes = await priceIncreaseCheck(row.customerId, normalized)
      if (changes.length && !priceAccepted)
        { res.status(409).json({ code: 'PRICE_INCREASED', priceChanges: changes, message: 'Harga produk naik.' }); return false }
    }
    const customerForPrices = await priceableCustomer(row.customerId)
    if (customerForPrices) await refreshCustomerPrices(customerForPrices, [...new Set(products.map((p) => p.itemCode))])
    const prices = await pricesForItems(row.customerId, normalized)
    const sources = new Set<string>()
    const snapshot = normalized.map((i) => {
      const product = products.find((p) => String(p.id) === i.productId)!
      const price = prices.get(product.itemCode)
      if (price) sources.add(price.source)
      return {
        product, qty: i.qty, ...(price ? {
          price: price.price, currency: price.currency,
          lineTotal: round6(i.qty * price.price), priceSource: price.source
        } : {})
      }
    })
    data.items = JSON.parse(JSON.stringify(snapshot))
    data.priceBasis = sources.size === 1 ? [...sources][0] : sources.size > 1 ? 'mixed' : null
  }

  return true
}
