
import { pricesForCatalog } from '@/services/pricing/pricing'
import type { CatalogProduct } from './catalog'

type CatalogPrices = Awaited<ReturnType<typeof pricesForCatalog>>

const pricePriority = (source?: string): number => {
  if (source === 'actual') return 0
  if (source === 'pricelist') return 1
  return 2
}

export const resolveCatalogPrices = (
  customerId: bigint | null,
  products: CatalogProduct[],
): Promise<CatalogPrices> => {
  if (customerId === null || products.length === 0) {
    return Promise.resolve(new Map())
  }

  return pricesForCatalog(
    customerId,
    products.map((product) => product.itemCode),
  )
}

export const filterAndSortProducts = (
  products: CatalogProduct[],
  prices: CatalogPrices,
  hasPriceCustomer: boolean,
  priceSource: string,
): CatalogProduct[] => {
  const filtered = products.filter((product) => {
    const resolved = prices.get(product.itemCode)
    const price = resolved?.price == null ? NaN : Number(resolved.price)

    if (hasPriceCustomer && (!Number.isFinite(price) || price <= 0)) {
      return false
    }

    if (priceSource && resolved?.source !== priceSource) {
      return false
    }

    return true
  })

  return filtered.sort((a, b) => {
    const difference =
      pricePriority(prices.get(a.itemCode)?.source) -
      pricePriority(prices.get(b.itemCode)?.source)

    return (
      difference ||
      a.itemName.localeCompare(b.itemName, 'id', {
        sensitivity: 'base',
      })
    )
  })
}
