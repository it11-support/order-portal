import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api } from '@lib'
import { Product } from '@repo/shared'
import { useAuth } from './AuthContext'

export type ProductSortField =
  'itemCode' | 'itemName' | 'productCategory' | 'salesUnit' | 'launchDate'

export type SortDirection = 'asc' | 'desc'

export type ProductFilters = {
  search: string
  category: string
  isActive: boolean | null
}

type ProductsContextType = {
  products: Product[]

  loading: boolean

  page: number
  pageSize: number
  total: number
  totalPages: number

  filters: ProductFilters

  sortBy: ProductSortField
  sortDirection: SortDirection

  setPage: (page: number) => void
  setPageSize: (pageSize: number) => void

  setSearch: (search: string) => void
  setCategory: (category: string) => void
  setIsActive: (isActive: boolean | null) => void

  setSortBy: (sortBy: ProductSortField) => void
  setSortDirection: (direction: SortDirection) => void

  fetchProducts: () => Promise<void>
  refresh: () => Promise<void>
}

const ProductsContext = createContext<ProductsContextType | null>(null)

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const staff = user?.role.name === 'admin' || user?.role.name === 'sales_admin'
  const [products, setProducts] = useState<Product[]>([])

  const [loading, setLoading] = useState(false)

  const [page, setPage] = useState(DEFAULT_PAGE)

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  const [total, setTotal] = useState(0)

  const [totalPages, setTotalPages] = useState(0)

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    isActive: null,
  })

  const [sortBy, setSortBy] = useState<ProductSortField>('itemName')

  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  /**
   * Fetch products
   */
  const fetchProducts = useCallback(async () => {
    if (!staff) {
      setProducts([])
      setTotal(0)
      setTotalPages(0)
      return
    }
    try {
      setLoading(true)

      const params = new URLSearchParams()

      params.set('page', String(page))
      params.set('pageSize', String(pageSize))

      if (filters.search.trim()) {
        params.set('search', filters.search.trim())
      }

      if (filters.category) {
        params.set('category', filters.category)
      }

      if (filters.isActive !== null) {
        params.set('isActive', String(filters.isActive))
      }

      params.set('sortBy', sortBy)
      params.set('sortDirection', sortDirection)

      const res = await api.get(`/products?${params.toString()}`)

      const data = res.data.data

      setProducts(data?.items ?? [])
      setTotal(data?.total ?? 0)
      setTotalPages(data?.totalPages ?? 0)
    } catch (error) {
      console.error('Failed to fetch products:', error)

      setProducts([])
      setTotal(0)
      setTotalPages(0)
    } finally {
      setLoading(false)
    }
  }, [page, pageSize, filters, sortBy, sortDirection, staff])

  /**
   * Fetch otomatis ketika:
   *
   * - page berubah
   * - pageSize berubah
   * - search berubah
   * - category berubah
   * - status berubah
   * - sorting berubah
   */
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  /**
   * Search
   */
  const handleSetSearch = useCallback((search: string) => {
    setFilters((prev) => ({
      ...prev,
      search,
    }))

    setPage(1)
  }, [])

  /**
   * Category
   */
  const handleSetCategory = useCallback((category: string) => {
    setFilters((prev) => ({
      ...prev,
      category,
    }))

    setPage(1)
  }, [])

  /**
   * Active status
   */
  const handleSetIsActive = useCallback((isActive: boolean | null) => {
    setFilters((prev) => ({
      ...prev,
      isActive,
    }))

    setPage(1)
  }, [])

  /**
   * Page size
   */
  const handleSetPageSize = useCallback((value: number) => {
    setPageSize(value)
    setPage(1)
  }, [])

  /**
   * Sorting
   */
  const handleSetSortBy = useCallback((value: ProductSortField) => {
    setSortBy(value)
    setPage(1)
  }, [])

  /**
   * Refresh
   */
  const refresh = useCallback(async () => {
    await fetchProducts()
  }, [fetchProducts])

  const value = useMemo(
    () => ({
      products,

      loading,

      page,
      pageSize,
      total,
      totalPages,

      filters,

      sortBy,
      sortDirection,

      setPage,

      setPageSize: handleSetPageSize,

      setSearch: handleSetSearch,

      setCategory: handleSetCategory,

      setIsActive: handleSetIsActive,

      setSortBy: handleSetSortBy,

      setSortDirection,

      fetchProducts,

      refresh,
    }),
    [
      products,
      loading,
      page,
      pageSize,
      total,
      totalPages,
      filters,
      sortBy,
      sortDirection,

      handleSetSearch,
      handleSetCategory,
      handleSetIsActive,
      handleSetPageSize,
      handleSetSortBy,

      fetchProducts,
      refresh,
    ],
  )

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>
}

export function useProducts() {
  const context = useContext(ProductsContext)

  if (!context) {
    throw new Error('useProducts must be used within ProductsProvider')
  }

  return context
}
