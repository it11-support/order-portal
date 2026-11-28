
import { pricesForCatalog } from '@/services/pricing/resolver'
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
  const ranked: {
    product: CatalogProduct
    priority: number
  }[] = []

  for (const product of products) {
    const resolved = prices.get(product.itemCode)

    if (hasPriceCustomer) {
      const price =
        resolved?.price == null
          ? NaN
          : Number(resolved.price)

      if (!Number.isFinite(price) || price <= 0) {
        continue
      }
    }

    if (priceSource && resolved?.source !== priceSource) {
      continue
    }

    ranked.push({
      product,
      priority: pricePriority(resolved?.source),
    })
  }

  ranked.sort(
    (a, b) =>
      a.priority - b.priority ||
      productNameCollator.compare(
        a.product.itemName,
        b.product.itemName,
      ),
  )

  return ranked.map(({ product }) => product)
}

const productNameCollator = new Intl.Collator('id', {
  sensitivity: 'base',
})