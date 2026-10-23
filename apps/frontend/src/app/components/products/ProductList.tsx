import type { CartItem, Product } from '@repo/shared'
import ProductRow from './ProductRow'

type ProductListProps = {
  products: Product[]
  cart: CartItem[]
  onContactSales?: (product: Product) => void
}

export const ProductList = ({ products, cart, onContactSales }: ProductListProps) => {
  const selectedIds = new Set(
    cart.filter((item) => (item.qty ?? 0) > 0).map((item) => String(item.product.id)),
  )

  return (
    <>
      <div className="md:hidden bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {products.map((product) => {
          const selected = selectedIds.has(String(product.id))
          return (
            <div key={String(product.id)} className={selected ? 'bg-accent/5' : ''}>
              <div className="px-4">
                <ProductRow product={product} onContactSales={onContactSales} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {products.map((product) => {
          const selected = selectedIds.has(String(product.id))
          return (
            <div
              key={String(product.id)}
              className={`rounded-2xl px-4 min-h-[88px] transition-colors ${
                selected
                  ? 'border border-accent bg-accent/5'
                  : 'border border-border bg-white hover:border-accent/40'
              }`}
            >
              <ProductRow product={product} onContactSales={onContactSales} />
            </div>
          )
        })}
      </div>
    </>
  )
}
