import { useMemo } from 'react'
import useSWR from 'swr'
import { swrFetcher } from '@lib'
import type { Product } from '@repo/shared'

type ProductResponse = {
  data: Product[]
  meta: {
    current_page: number
    total_pages: number
    total_records: number
    limit: number
  }
}

export const useProductCatalog = (customerId: string, search: string, historyPage: number, pricelistPage: number, enabled: boolean) => {
  const productUrl = customerId && enabled
    ? `/categories/products?customerId=${encodeURIComponent(customerId)}&pageSize=20&search=${encodeURIComponent(search)}` : null

  const { data: historyData, isLoading: historyLoading, error: historyError } = useSWR<ProductResponse>(
    productUrl ? `${productUrl}&priceSource=actual&page=${historyPage}` : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false
    }
  )

  const { data: pricelistData, isLoading: pricelistLoading, error: pricelistError } = useSWR<ProductResponse>(
    productUrl ? `${productUrl}&priceSource=pricelist&page=${pricelistPage}` : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false
    }
  )
  const historyProducts = useMemo(() => [...(historyData?.data ?? [])].sort((a, b) => {
    const dateA = a.lastInvoiceDate ? new Date(a.lastInvoiceDate).getTime() : 0
    const dateB = b.lastInvoiceDate ? new Date(b.lastInvoiceDate).getTime() : 0
    return dateB - dateA
  }), [historyData?.data])

  const pricelistProducts = useMemo(() => pricelistData?.data ?? [], [pricelistData?.data])

  const productSuggestions = useMemo(() => [
    ...historyProducts.map(product => ({ product, source: 'History Pembelian' })),
    ...pricelistProducts.map(product => ({ product, source: 'Produk Lainnya' })),
  ].slice(0, 10), [historyProducts, pricelistProducts])

  return {
    historyProducts,
    historyMeta: historyData?.meta,
    historyLoading,
    historyError,
    pricelistProducts,
    pricelistMeta: pricelistData?.meta,
    pricelistLoading,
    pricelistError,
    productSuggestions,
    suggestionsLoading: historyLoading || pricelistLoading
  }
}
