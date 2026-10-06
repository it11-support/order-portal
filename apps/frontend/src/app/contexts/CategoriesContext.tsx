import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import useSWRInfinite from 'swr/infinite'

import { useAuth } from './authHook'
import { useWSEvent } from './WebSocketContext'
import { swrFetcher } from '@lib'
import { ApiResponse, Product } from '@repo/shared'

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

  const identity = user ? `${user.role.name}:${user.id}` : ''

  const key = useMemo(() => {
    if (!identity) {
      return null
    }

    const query = resolveCatalogQuery(selectedCategory, search)

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
  }, [identity, selectedCategory, search, page, pageSize])

  const { data, isLoading, error } = useSWR<ApiResponse<Product>>(key, swrFetcher)

  return {
    products: data?.data ?? [],

    meta: data?.meta,

    loading: isLoading,

    error: error?.message ?? '',
  }
}

// ============================================================
// CATALOG PRODUCTS
//
// Hook utama katalog dengan infinite pagination.
//
// mode `all`
//
// mode `category`
//   -> backend filter Product.productCategory
//
//
// mode `search`
//   -> global search, kategori diabaikan
// ============================================================

export const useCatalogProducts = () => {
  const { selectedCategory, search } = useCategories()

  const { user } = useAuth()

  const identity = user ? `${user.role.name}:${user.id}` : ''

  const query = useMemo(
    () => resolveCatalogQuery(selectedCategory, search),
    [selectedCategory, search],
  )

  // ==========================================================
  // BASE QUERY
  // ==========================================================

  const baseQuery = useMemo(() => {
    const params = new URLSearchParams()

    if (identity) {
      params.set('viewer', identity)
    }

    // Search SELALU global: kalau ada search, category tidak dikirim sama
    // sekali. Backend juga mengabaikan `category` yang datang bersama search.
    if (query.search) {
      params.set('search', query.search)
    } else if (query.category) {
      params.set('category', query.category)
    }

    return params.toString()
  }, [identity, query])

  // ==========================================================
  // SWR INFINITE KEY
  // ==========================================================

  const getKey = useCallback(
    (pageIndex: number, previousPageData: ApiResponse<Product> | null) => {
      if (!identity) {
        return null
      }


      // Stop kalau page sebelumnya kosong
      if (previousPageData && previousPageData.data.length === 0) {
        return null
      }

      // Lebih akurat:
      // stop kalau backend sudah mengatakan tidak ada page lagi.
      if (previousPageData?.meta && pageIndex + 1 > previousPageData.meta.total_pages) {
        return null
      }

      const params = new URLSearchParams(baseQuery)

      params.set('page', String(pageIndex + 1))

      params.set('pageSize', String(CATALOG_PAGE_SIZE))

      return `/categories/products?${params.toString()}`
    },
    [baseQuery, identity, query.mode],
  )

  // ==========================================================
  // FETCH
  // ==========================================================

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
  })

  // ==========================================================
  // MERGE PAGES
  // ==========================================================

  const products = useMemo(() => {
    if (!pages) {
      return []
    }

    // Safety DISTINCT by itemCode.
    //
    // Backend sudah merge + distinct sebelum pagination, ini hanya jaga-jaga
    // kalau data berubah saat user sedang infinite scroll. Identitas produk
    // adalah itemCode (bukan itemName) dan dinormalisasi trim/uppercase supaya
    // whitespace tidak menyalin satu produk jadi dua.
    const seen = new Set<string>()

    const result: Product[] = []

    for (const page of pages) {
      for (const product of page.data) {
        const code = product.itemCode.trim().toUpperCase()

        if (seen.has(code)) {
          continue
        }

        seen.add(code)

        result.push(product)
      }
    }

    return result
  }, [pages])

  // ==========================================================
  // PAGINATION STATE
  // ==========================================================

  const lastPage = pages?.[pages.length - 1]

  const total = pages?.[0]?.meta?.total_records ?? 0

  const totalPages = pages?.[0]?.meta?.total_pages ?? 0

  const isReachingEnd = Boolean(
    lastPage &&
    (lastPage.data.length === 0 ||
      (totalPages > 0 && size >= totalPages) ||
      (total > 0 && products.length >= total)),
  )

  // ==========================================================
  // LOAD MORE
  // ==========================================================

  const loadMore = useCallback(() => {
    if (isReachingEnd || isValidating) {
      return
    }

    void setSize((currentSize) => currentSize + 1)
  }, [isReachingEnd, isValidating, setSize])

  return {
    products,
    loading: !pages && isLoading,
    isFetching: isValidating,
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
