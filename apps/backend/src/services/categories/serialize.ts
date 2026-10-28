import { normalizeItemCode } from '@/services/customer-catalog'
import { round6, pricesForCatalog } from '@/services/pricing'
import type { CatalogProduct } from './catalog'
import { asFiniteNumber, type PriceChange } from './price-changes'

export function serializeCatalogProducts(
  products: CatalogProduct[],
  prices: Awaited<ReturnType<typeof pricesForCatalog>>,
  changes: Map<string, PriceChange>,
) {
  return products.map((product) => {
    const resolved = prices.get(product.itemCode)
    const change = changes.get(normalizeItemCode(product.itemCode))
    const catalogPrice = asFiniteNumber(resolved?.price)
    return {
      ...product,
      price: catalogPrice === null ? null : round6(catalogPrice),
      currency: resolved?.currency ?? null,
      priceSource: resolved?.source ?? null,
      lastInvoice: change?.lastInvoice ?? null,
      lastInvoiceDate: change?.lastInvoiceDate ?? null,
      lastInvoicePrice: change?.lastInvoicePrice ?? null,
      lastInvoiceBasePrice: change?.lastInvoiceBasePrice ?? null,
      currentPrice: change?.currentPrice ?? null,
      discountApplied: change?.discountApplied ?? null,
      discountSource: change?.discountSource ?? null,
      priceDifference: change?.priceDifference ?? null,
      priceIncreasePercent: change?.priceIncreasePercent ?? null,
      priceIncreased: change?.priceIncreased ?? false,
    }
  })
}
