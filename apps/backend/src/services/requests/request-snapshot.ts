
import { round6 } from '@/services/pricing'
import type { RequestSnapshotItem, SnapshotOptions } from './types'

export const buildRequestSnapshot = ({
  products,
  items,
  prices,
  kind,
}: SnapshotOptions) => {
  const productMap = new Map(
    products.map((product) => [String(product.id), product]),
  )

  const sources = new Set<string>()

  const snapshot: RequestSnapshotItem[] = items.map((item) => {
    const product = productMap.get(item.productId)

    if (!product) {
      throw new Error(`Produk ${item.productId} tidak ditemukan`)
    }

    const price = prices.get(product.itemCode)
    const qty = item.qty ?? 1

    if (price) {
      sources.add(price.source)
    }

    return {
      product,
      qty,
      ...(price
        ? {
          price: price.price,
          currency: price.currency,
          priceSource: price.source,
          lineTotal: kind === 'order'
            ? round6(qty * price.price)
            : null,
        }
        : {}),
    }
  })

  const priceBasis =
    sources.size === 1
      ? [...sources][0]
      : sources.size > 1
        ? 'mixed'
        : null

  return { snapshot, priceBasis }
}
