
import { useState } from 'react'
import { useCategories, useProducts } from '@contexts'

export const useAdminProductList = () => {
  const {
    products,
    loading,
    isFetching,
    isReachingEnd,
    total,
    filters,
    setSearch,
    setCategory,
    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,
    loadMore,
  } = useProducts()

  const { categories } = useCategories()

  const [categoryOpen, setCategoryOpen] = useState(false)

  const selectedCategory = categories.find(
    (category) => category.name === filters.category,
  )

  const selectCategory = (category: string) => {
    setCategory(category)
    setCategoryOpen(false)
  }

  const clearSearch = () => {
    setSearch('')
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(
        sortDirection === 'asc' ? 'desc' : 'asc',
      )
      return
    }

    setSortBy(field)
    setSortDirection('asc')
  }

  return {
    products,
    loading,
    isFetching,
    isReachingEnd,
    total,
    filters,
    categories,
    selectedCategory,

    categoryOpen,
    setCategoryOpen,

    sortBy,
    sortDirection,

    setSearch,
    clearSearch,
    selectCategory,
    handleSort,
    loadMore,
  }
}
