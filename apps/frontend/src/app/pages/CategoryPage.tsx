import { useParams, useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import { ProductList } from '@components'
import { CATEGORIES, PRODUCTS } from '@lib'
import { useCart } from '@contexts'

const CategoryPage = () => {
  const { categoryId } = useParams<{ categoryId: string }>()
  const navigate = useNavigate()
  const { cart, increase, decrease, remove } = useCart()

  const category = CATEGORIES.find((c) => c.id === categoryId)
  const categoryProducts = PRODUCTS.filter((p) => p.category === categoryId)

  if (!category) {
    return <Shell title="Kategori tidak ditemukan">Kategori tidak ditemukan</Shell>
  }

  return (
    <Shell title={`${category.emoji} ${category.name}`} showBack>
      <ProductList
        products={categoryProducts}
        cart={cart}
        increase={increase}
        decrease={decrease}
        remove={remove}
      />
    </Shell>
  )
}

export default CategoryPage
