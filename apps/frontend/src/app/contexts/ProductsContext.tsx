import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import useSWRInfinite from 'swr/infinite'
import { swrFetcher } from '@lib'
import { Product, ApiResponse } from '@repo/shared'
import { useAuth } from './authHook'

export type ProductSortField =
  | 'itemCode'
  | 'itemName'
  | 'productCategory'
  | 'salesUnit'
  | 'launchDate'

export type SortDirection = 'asc' | 'desc'

export type ProductFilters = {
  search: string
  category: string
  isActive: boolean | null
}

const DEFAULT_PAGE_SIZE = 40

type ProductsContextType = {
  products: Product[]
  loading: boolean
  isFetching: boolean
  isReachingEnd: boolean

  pageSize: number
  total: number
  totalPages: number

  filters: ProductFilters

  sortBy: ProductSortField
  sortDirection: SortDirection

  loadMore: () => void
  setPageSize: (pageSize: number) => void

  setSearch: (search: string) => void
  setCategory: (category: string) => void
  setIsActive: (isActive: boolean | null) => void

  setSortBy: (sortBy: ProductSortField) => void
  setSortDirection: (direction: SortDirection) => void
}

const ProductsContext = createContext<ProductsContextType | null>(null)

export const ProductsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()

  const staff = user?.role.name === 'admin' || user?.role.name === 'sales_admin'
  const identity = user ? `${user.role.name}:${user.id}` : ''

  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE)

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    isActive: null,
  })

  const [sortBy, setSortBy] = useState<ProductSortField>('itemName')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  /**
   * SWR infinite key. Each page fetches `pageSize` products from `/products`.
   * Returns null (no fetch) until an authenticated staff user is present,
   * and stops requesting once a previous page was empty.
   */
  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiResponse<Product>) => {
      if (previousPageData && previousPageData.data.length === 0) return null
      if (!identity || !staff) return null

      const params = new URLSearchParams()
      params.set('page', String(pageIndex + 1))
      params.set('pageSize', String(pageSize))

      if (filters.search.trim()) params.set('search', filters.search.trim())
      if (filters.category.trim()) params.set('category', filters.category.trim())
      if (filters.isActive !== null) params.set('isActive', String(filters.isActive))

      params.set('sortBy', sortBy)
      params.set('sortDirection', sortDirection)

      return `/products?${params.toString()}`
    },
    [pageSize, filters, sortBy, sortDirection, identity, staff],
  )

  const {
    data: pages,
    size,
    setSize,
    isValidating,
    isLoading,
  } = useSWRInfinite<ApiResponse<Product>>(getKey, swrFetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  const products = useMemo(
    () => (pages ? pages.reduce<Product[]>((acc, page) => acc.concat(page.data), []) : []),
    [pages],
  )

  const lastPage = pages?.[pages.length - 1]
  const total = pages?.[0]?.meta?.total_records ?? 0
  const totalPages = pages?.[0]?.meta?.total_pages ?? 0

  const isReachingEnd =
    !lastPage ||
    lastPage.data.length === 0 ||
    lastPage.data.length < pageSize ||
    (total > 0 && products.length >= total)

  const loading = !pages && isLoading

  const loadMore = useCallback(() => {
    if (!isReachingEnd) setSize(size + 1)
  }, [isReachingEnd, setSize, size])

  const handleSetSearch = useCallback(
    (search: string) => {
      setFilters((prev) => ({ ...prev, search }))
      setSize(1)
    },
    [setSize],
  )

  const handleSetCategory = useCallback(
    (category: string) => {
      setFilters((prev) => ({ ...prev, category }))
      setSize(1)
    },
    [setSize],
  )

  const handleSetIsActive = useCallback(
    (isActive: boolean | null) => {
      setFilters((prev) => ({ ...prev, isActive }))
      setSize(1)
    },
    [setSize],
  )

  const handleSetPageSize = useCallback(
    (value: number) => {
      setPageSizeState(value)
      setSize(1)
    },
    [setSize],
  )

  const handleSetSortBy = useCallback(
    (value: ProductSortField) => {
      setSortBy(value)
      setSize(1)
    },
    [setSize],
  )

  const handleSetSortDirection = useCallback(
    (value: SortDirection) => {
      setSortDirection(value)
      setSize(1)
    },
    [setSize],
  )

  const value = useMemo(
    () => ({
      products,
      loading,
      isFetching: isValidating,
      isReachingEnd,

      pageSize,
      total,
      totalPages,

      filters,

      sortBy,
      sortDirection,

      loadMore,

      setPageSize: handleSetPageSize,

      setSearch: handleSetSearch,

      setCategory: handleSetCategory,

      setIsActive: handleSetIsActive,

      setSortBy: handleSetSortBy,

      setSortDirection: handleSetSortDirection,
    }),
    [
      products,
      loading,
      isValidating,
      isReachingEnd,
      pageSize,
      total,
      totalPages,
      filters,
      sortBy,
      sortDirection,
      loadMore,
      handleSetPageSize,
      handleSetSearch,
      handleSetCategory,
      handleSetIsActive,
      handleSetSortBy,
      handleSetSortDirection,
    ],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export const useProducts = () => {
  const context = useContext(ProductsContext)

  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider')
  }

  return context
}
