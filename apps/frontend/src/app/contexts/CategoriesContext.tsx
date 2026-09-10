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
  error: string
  getCategory: (id: string | number) => Category | undefined
  getCategoryIcon: (id: string | number) => string | undefined
  getProducts: (category: string, search?: string) => Promise<Product[]>
}
const CategoriesContext = createContext<CategoriesContextType | null>(null)
export function CategoriesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<{
    owner: string
    categories: Category[]
    products: Product[]
    suggestions: Product[]
  }>({
    owner: '',
    categories: [],
    products: [],
    suggestions: [],
  })
  const requestId = useRef(0)
  const role = user?.role.name
  const getProducts = useCallback(
    async (category: string, term = ''): Promise<Product[]> => {
      const request = ++requestId.current
      if (!identity) return []
      setLoading(true)
      setError('')
      try {
        const params = new URLSearchParams({ category, search: term.trim() })
        const [categories, products, suggestions] = await Promise.all([
          api.get('/categories'),
          api.get(`/categories/products?${params}`),
          role === 'customer'
            ? api.get(
                `/categories/products?${new URLSearchParams({ suggested: 'true', search: term.trim() })}`,
              )
            : Promise.resolve({ data: { data: [] } }),
        ])
        if (request !== requestId.current) return []
        setData({
          owner: identity,
          categories: categories.data.data,
          products: products.data.data,
          suggestions: suggestions.data.data,
        })
        return products.data.data
      } catch {
        if (request === requestId.current) {
          setError('Gagal memuat katalog. Silakan muat ulang halaman.')
          setData({ owner: identity, categories: [], products: [], suggestions: [] })
        }
        return []
      } finally {
        if (request === requestId.current) setLoading(false)
      }
    },
    [identity, role],
  )
  useEffect(() => {
    ++requestId.current
    setSelectedCategory('')
    setSearch('')
    return () => {
      ++requestId.current
    }
  }, [identity])
  useEffect(() => {
    const timer = setTimeout(() => {
      void getProducts(selectedCategory, search)
    }, 150)
    return () => {
      clearTimeout(timer)
      ++requestId.current
    }
  }, [getProducts, selectedCategory, search])
  const categories = data.owner === identity ? data.categories : []
  const getCategory = (id: string | number) =>
    categories.find((c) => String(c.id) === String(id) || c.code === String(id))
  return (
    <CategoriesContext.Provider
      value={{
        categories,
        selectedCategory,
        setSelectedCategory,
        search,
        setSearch,
        filteredProducts: data.owner === identity ? data.products : [],
        suggestedProducts: data.owner === identity ? data.suggestions : [],
        loading: loading || Boolean(identity && data.owner !== identity),
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
  if (!context) throw new Error('useCategories must be used within CategoriesProvider')
  return context
}
