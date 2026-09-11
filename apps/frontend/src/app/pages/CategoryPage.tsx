import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Shell } from '@layouts'
import { ProductList } from '@components'
import { useCart, useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

const CategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>()

  const { cart, increase, decrease, remove, setQty } = useCart()

  const { loading, getCategory, filteredProducts, setSelectedCategory } = useCategories()

  const category = categoryId ? getCategory(categoryId) : undefined

  useEffect(() => {
    if (categoryId) setSelectedCategory(categoryId)
  }, [categoryId, setSelectedCategory])

  if (!categoryId) {
    return <Shell title="Kategori tidak ditemukan">Kategori tidak ditemukan</Shell>
  }

  // Categories masih loading
  if (loading) {
    return <Shell title="Loading...">Loading...</Shell>
  }

  // Categories sudah selesai tapi tidak ditemukan
  if (!category) {
    return <Shell title="Kategori tidak ditemukan">Kategori tidak ditemukan</Shell>
  }

  return (
    <Shell
      title={
        <span className="flex items-center gap-2">
          {category.icon && <CategoryIcon name={category.icon} size={16} />}

          {category.name}
        </span>
      }
      showBack
    >
      <ProductList products={filteredProducts} cart={cart} />
    </Shell>
  )
}

export default CategoryPage
