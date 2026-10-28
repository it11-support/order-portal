import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { CatalogAccessError, loadCatalog } from '@/services/categories/catalog'
import { resolveCatalogPrices, filterAndSortProducts } from '@/services/categories/pricing'
import { loadPriceChanges } from '@/services/categories/price-changes'
import { serializeCatalogProducts } from '@/services/categories/serialize'

type CatalogQuery = {
  search: string
  category: string
  priceSource: string
  customerId?: string
  page: number
  pageSize: number
  shouldPaginate: boolean
}

function parseCatalogQuery(req: AuthenticatedRequest): CatalogQuery {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : ''
  const category = search ? '' : typeof req.query.category === 'string' ? req.query.category.trim() : ''
  const priceSource = typeof req.query.priceSource === 'string' ? req.query.priceSource.trim().toLowerCase() : ''
  const customerId = typeof req.query.customerId === 'string' && /^\d+$/.test(req.query.customerId)
    ? req.query.customerId : undefined
  const pageParam = typeof req.query.page === 'string' ? req.query.page : ''
  const pageSizeParam = typeof req.query.pageSize === 'string' ? req.query.pageSize : ''
  return {
    search, category, priceSource, customerId,
    shouldPaginate: Boolean(pageParam || pageSizeParam),
    page: Math.max(Number(pageParam) || 1, 1),
    pageSize: Math.min(Math.max(Number(pageSizeParam) || 40, 1), 100),
  }
}

export const getProductsByCategory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const query = parseCatalogQuery(req)
  if (query.priceSource && query.priceSource !== 'actual' && query.priceSource !== 'pricelist') {
    res.status(400).json({ message: 'Invalid priceSource. Use actual or pricelist.' })
    return
  }
  let catalog: Awaited<ReturnType<typeof loadCatalog>>
  try {
    catalog = await loadCatalog(req, query)
  } catch (error) {
    if (!(error instanceof CatalogAccessError)) throw error
    res.status(403).json({ message: error.message })
    return
  }
  const prices = await resolveCatalogPrices(catalog.priceCustomerId, catalog.products)
  const filtered = filterAndSortProducts(catalog.products, prices, catalog.priceCustomerId !== null, query.priceSource)
  const total = filtered.length
  const products = query.shouldPaginate
    ? filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize)
    : filtered
  const changes = await loadPriceChanges(catalog.priceCustomerId, products)
  const data = serializeCatalogProducts(products, prices, changes)
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    data,
    meta: {
      current_page: query.page,
      total_pages: query.shouldPaginate ? Math.ceil(total / query.pageSize) || 0 : total > 0 ? 1 : 0,
      total_records: total,
      limit: query.shouldPaginate ? query.pageSize : products.length,
    },
  })
}
