import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

import { api } from '@lib'
import { Product } from '@repo/shared'
import { useAuth } from './AuthContext'

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

  filteredProducts: Product[]
  suggestedProducts: Product[]

  loading: boolean
  suggestedLoading: boolean

  error: string

  getCategory: (id: string | number) => Category | undefined
  getCategoryIcon: (id: string | number) => string | undefined

  getProducts: (category: string, search?: string) => Promise<Product[]>
}

const CategoriesContext = createContext<CategoriesContextType | null>(null)

export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()

  const identity = user ? `${user.role.name}:${user.id}` : ''

  const role = user?.role.name
  const isCustomer = role === 'customer'

  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')

  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [suggestions, setSuggestions] = useState<Product[]>([])

  const [loading, setLoading] = useState(false)
  const [suggestedLoading, setSuggestedLoading] = useState(false)

  const [error, setError] = useState('')

  const productsRequestId = useRef(0)
  const suggestionsRequestId = useRef(0)

  /**
   * Load categories.
   *
   * Hanya dijalankan ketika user/identity berubah.
   */
  const loadCategories = useCallback(async () => {
    if (!identity) {
      setCategories([])
      return
    }

    try {
      const response = await api.get('/categories')

      setCategories(response.data.data)
    } catch {
      setError('Gagal memuat kategori. Silakan muat ulang halaman.')
      setCategories([])
    }
  }, [identity])

  /**
   * Load produk utama.
   */
  const getProducts = useCallback(
    async (category: string, term = ''): Promise<Product[]> => {
      if (!identity) {
        return []
      }

      const request = ++productsRequestId.current

      setLoading(true)
      setError('')

      try {
        const params = new URLSearchParams()

        if (category) {
          params.set('category', category)
        }

        if (term.trim()) {
          params.set('search', term.trim())
        }

        const response = await api.get(`/categories/products?${params.toString()}`)

        if (request !== productsRequestId.current) {
          return []
        }

        const result: Product[] = response.data.data

        setProducts(result)

        return result
      } catch {
        if (request === productsRequestId.current) {
          setProducts([])
          setError('Gagal memuat katalog. Silakan muat ulang halaman.')
        }

        return []
      } finally {
        if (request === productsRequestId.current) {
          setLoading(false)
        }
      }
    },
    [identity],
  )

  /**
   * Load suggested products.
   *
   * Menggunakan virtual category SUGGESTED.
   */
  const loadSuggestions = useCallback(
    async (term = '') => {
      if (!identity || !isCustomer) {
        setSuggestions([])
        return
      }

      const request = ++suggestionsRequestId.current

      setSuggestedLoading(true)

      try {
        const params = new URLSearchParams({
          category: 'SUGGESTED',
        })

        if (term.trim()) {
          params.set('search', term.trim())
        }

        const response = await api.get(`/categories/products?${params.toString()}`)

        if (request !== suggestionsRequestId.current) {
          return
        }

        setSuggestions(response.data.data)
      } catch {
        if (request === suggestionsRequestId.current) {
          setSuggestions([])
        }
      } finally {
        if (request === suggestionsRequestId.current) {
          setSuggestedLoading(false)
        }
      }
    },
    [identity, isCustomer],
  )

  /**
   * Reset state ketika user berubah.
   */
  useEffect(() => {
    ++productsRequestId.current
    ++suggestionsRequestId.current

    setSelectedCategory('')
    setSearch('')
    setProducts([])
    setSuggestions([])
    setCategories([])
    setError('')

    if (!identity) return

    void loadCategories()
  }, [identity, loadCategories])

  /**
   * Produk utama.
   */
  useEffect(() => {
    if (!identity) return

    const timer = setTimeout(() => {
      void getProducts(selectedCategory, search)
    }, 150)

    return () => {
      clearTimeout(timer)
      ++productsRequestId.current
    }
  }, [identity, selectedCategory, search, getProducts])

  /**
   * Suggested products.
   *
   * Search mengikuti search katalog.
   */
  useEffect(() => {
    if (!identity || !isCustomer) return

    const timer = setTimeout(() => {
      void loadSuggestions(search)
    }, 150)

    return () => {
      clearTimeout(timer)
      ++suggestionsRequestId.current
    }
  }, [identity, isCustomer, search, loadSuggestions])

  const getCategory = (id: string | number) =>
    categories.find(
      (category) => String(category.id) === String(id) || category.code === String(id),
    )

  return (
    <CategoriesContext.Provider
      value={{
        categories,

        selectedCategory,
        setSelectedCategory,

        search,
        setSearch,

        filteredProducts: products,
        suggestedProducts: suggestions,

        loading,
        suggestedLoading,

        error,

        getCategory,

        getCategoryIcon: (id) => getCategory(id)?.icon,

        getProducts,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  )
}

export function useCategories() {
  const context = useContext(CategoriesContext)

  if (!context) {
    throw new Error('useCategories must be used within CategoriesProvider')
  }

  return context
}
