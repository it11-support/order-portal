import { pricesForCatalog } from '@/services/pricing'
import type { CatalogProduct } from './catalog'

type CatalogPrices = Awaited<ReturnType<typeof pricesForCatalog>>

export async function resolveCatalogPrices(customerId: bigint | null, products: CatalogProduct[]) {
  const prices: CatalogPrices = customerId && products.length
    ? await pricesForCatalog(customerId, products.map((product) => product.itemCode))
    : new Map()
  return prices
}

export function filterAndSortProducts(
  products: CatalogProduct[],
  prices: CatalogPrices,
  hasPriceCustomer: boolean,
  priceSource: string,
): CatalogProduct[] {
  const filtered = products.filter((product) => {
    const resolved = prices.get(product.itemCode)
    if (hasPriceCustomer && (!resolved || resolved.price == null ||
      !Number.isFinite(Number(resolved.price)) || Number(resolved.price) <= 0)) return false
    if (priceSource && resolved?.source !== priceSource) return false
    return true
  })
  const priority = (source?: string) => source === 'actual' ? 0 : source === 'pricelist' ? 1 : 2
  return filtered.sort((a, b) => {
    const difference = priority(prices.get(a.itemCode)?.source) - priority(prices.get(b.itemCode)?.source)
    return difference || a.itemName.localeCompare(b.itemName, 'id', { sensitivity: 'base' })
  })
}
