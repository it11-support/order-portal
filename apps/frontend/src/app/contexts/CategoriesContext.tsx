import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import useSWRInfinite from 'swr/infinite'

import { useAuth } from './authHook'
import { useWSEvent } from './WebSocketContext'
import { swrFetcher } from '@lib'
import { ApiResponse, Product } from '@repo/shared'
import { useDebounce } from '@hooks'

export type Category = {
  id: number
  code: string
  name: string
  icon?: string
  sortOrder: number
  isActive: boolean
}

type CategoriesContextType = {
  categories: Category[]
  selectedCategory: string
  setSelectedCategory: React.Dispatch<React.SetStateAction<string>>
  search: string
  setSearch: React.Dispatch<React.SetStateAction<string>>
  loading: boolean
  error: string
  getCategory: (id: string | number) => Category | undefined
  getCategoryIcon: (id: string | number) => string | undefined
}

const CategoriesContext = createContext<CategoriesContextType | null>(null)

const CATALOG_PAGE_SIZE = 45

/**
 * Resolusi mode katalog untuk satu waktu.
 *
 * Aturannya:
 * - search non-empty  -> `search` (global). Kategori yang masih terpilih di
 *   UI tetap ada di state, tapi tidak boleh ikut menentukan request.
 * - search kosong + kategori biasa -> `category`.
 * - search kosong tanpa kategori -> `all`: purchased + other.
 */
export type CatalogQueryMode = 'all' | 'category' | 'search'

export const resolveCatalogQuery = (
  selectedCategory: string,
  search: string,
): { mode: CatalogQueryMode; category: string; search: string } => {
  const normalizedSearch = search.trim()

  if (normalizedSearch) {
    return { mode: 'search', category: '', search: normalizedSearch }
  }

  if (selectedCategory) {
    return { mode: 'category', category: selectedCategory, search: '' }
  }

  return { mode: 'all', category: '', search: '' }
}

// ============================================================
// PROVIDER
// ============================================================

export const CategoriesProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const { mutate } = useSWRConfig()

  const identity = user ? `${user.role.name}:${user.id}` : ''

  const [selectedCategory, setSelectedCategory] = useState('')

  const [search, setSearch] = useState('')

  // Reset filter ketika user berubah
  useEffect(() => {
    setSelectedCategory('')
    setSearch('')
  }, [identity])

  // ==========================================================
  // WEBSOCKET PRICE INVALIDATION
  // ==========================================================

  useWSEvent(
    'price.increased',

    useCallback(() => {
      void mutate((key) => typeof key === 'string' && key.startsWith('/categories/products'))
    }, [mutate]),
  )

  // ==========================================================
  // CATEGORIES
  // ==========================================================

  const {
    data: categoriesData,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useSWR<ApiResponse<Category>>(
    identity ? '/categories' : null,

    swrFetcher,
  )

  const categories = categoriesData?.data ?? []

  // ==========================================================
  // CATEGORY HELPERS
  // ==========================================================

  const getCategory = useCallback(
    (id: string | number) =>
      categories.find(
        (category) => String(category.id) === String(id) || category.code === String(id),
      ),
    [categories],
  )

  const getCategoryIcon = useCallback((id: string | number) => getCategory(id)?.icon, [getCategory])

  // ==========================================================
  // CONTEXT
  // ==========================================================

  const value = useMemo<CategoriesContextType>(
    () => ({
      categories,
      selectedCategory,
      setSelectedCategory,
      search,
      setSearch,
      loading: categoriesLoading,
      error: categoriesError?.message ?? '',
      getCategory,
      getCategoryIcon,
    }),
    [
      categories,
      selectedCategory,
      search,
      categoriesLoading,
      categoriesError,
      getCategory,
      getCategoryIcon,
    ],
  )

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>
}

// ============================================================
// ALL PRODUCTS
//
// Dipakai SearchPage dan CategoryPage yang butuh satu page utuh.
//
// Mengikuti resolveCatalogQuery, jadi:
// - search non-empty  -> hanya kirim search, kategori diabaikan
// - search kosong     -> kirim kategori terpilih, atau SEMUA
//   sendiri; dua request sekaligus akan menampilkan produk yang sama dua kali.
//
// dalam urutan prioritas itu.
// ============================================================

export const useAllProducts = (page = 1, pageSize = CATALOG_PAGE_SIZE) => {
  const { selectedCategory, search } = useCategories()
  const { user } = useAuth()
  const debouncedSearch = useDebounce(search.trim(), 500)

  const identity = user ? `${user.role.name}:${user.id}` : ''

  const key = useMemo(() => {
    if (!identity) {
      return null
    }

    const query = resolveCatalogQuery(selectedCategory, debouncedSearch)

    const params = new URLSearchParams()

    params.set('viewer', identity)

    params.set('page', String(page))

    params.set('pageSize', String(pageSize))

    if (query.search) {
      params.set('search', query.search)
    } else if (query.category) {
      params.set('category', query.category)
    }

    return `/categories/products?${params.toString()}`
  }, [identity, selectedCategory, debouncedSearch, page, pageSize])

  const { data, isLoading, error } = useSWR<ApiResponse<Product>>(key, swrFetcher)

  return {
    products: data?.data ?? [],

    meta: data?.meta,

    loading: isLoading,

    error: error?.message ?? '',
  }
}

export const useCatalogProducts = (priceSource?: 'actual' | 'pricelist') => {
  const { selectedCategory, search } = useCategories()
  const { user } = useAuth()
  const debouncedSearch = useDebounce(search.trim(), 500)
  const identity = user ? `${user.role.name}:${user.id}` : ''

  const query = useMemo(
    () => resolveCatalogQuery(selectedCategory, debouncedSearch),
    [selectedCategory, debouncedSearch],
  )

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams()

    if (identity) {
      params.set('viewer', identity)
    }

    // Search bersifat global dan mengabaikan kategori
    if (query.search?.trim()) {
      params.set('search', query.search.trim())
    } else if (query.category) {
      params.set('category', query.category)
    }

    // Filter sumber harga opsional
    if (priceSource) {
      params.set('priceSource', priceSource)
    }

    return params.toString()
  }, [identity, query.search, query.category, priceSource])

  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiResponse<Product> | null) => {
      if (!identity) return null

      if (previousPageData) {
        if (!previousPageData.data?.length) {
          return null
        }

        const totalPages = previousPageData.meta?.total_pages

        if (typeof totalPages === 'number' && pageIndex + 1 > totalPages) {
          return null
        }

        if (totalPages == null && previousPageData.data.length < CATALOG_PAGE_SIZE) {
          return null
        }
      }

      const params = new URLSearchParams(baseQuery)

      params.set('page', String(pageIndex + 1))
      params.set('pageSize', String(CATALOG_PAGE_SIZE))

      return `/categories/products?${params.toString()}`
    },
    [baseQuery, identity],
  )

  const {
    data: pages,
    size,
    setSize,
    isLoading,
    isValidating,
    error,
  } = useSWRInfinite<ApiResponse<Product>>(getKey, swrFetcher, {
    revalidateFirstPage: false,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    persistSize: false,
    keepPreviousData: false,
  })

  // Gabungkan seluruh halaman dan hilangkan duplikat
  const products = useMemo(() => {
    if (!pages?.length) return []

    const seen = new Set<string>()
    const result: Product[] = []

    for (const page of pages) {
      for (const product of page.data ?? []) {
        const code = product.itemCode?.trim().toUpperCase()

        if (!code || seen.has(code)) continue

        seen.add(code)
        result.push(product)
      }
    }

    return result
  }, [pages])

  const firstPage = pages?.[0]
  const lastPage = pages?.[pages.length - 1]

  const total = firstPage?.meta?.total_records ?? 0

  const totalPages = firstPage?.meta?.total_pages ?? 0

  const isLoadingMore = isValidating && !!pages && size > pages.length

  const isReachingEnd = Boolean(
    lastPage &&
    (lastPage.data.length === 0 ||
      (totalPages > 0 && pages.length >= totalPages) ||
      (totalPages === 0 && lastPage.data.length < CATALOG_PAGE_SIZE)),
  )

  const loadMore = useCallback(() => {
    if (!identity || !pages?.length || isLoading || isValidating || isReachingEnd) {
      return
    }

    void setSize((currentSize) => currentSize + 1)
  }, [identity, pages, isLoading, isValidating, isReachingEnd, setSize])

  return {
    products,
    loading: !!identity && !pages && isLoading,
    isFetching: isValidating || isLoadingMore,
    isReachingEnd,
    loadMore,
    total,
    totalPages,
    error: error?.message ?? '',
  }
}

// ============================================================
// CONTEXT HOOK
// ============================================================

export const useCategories = () => {
  const context = useContext(CategoriesContext)

  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider')
  }

  return context
}
