import { CartItem, Product } from '@repo/shared'
import ProductRow from './ProductRow'

type ProductListProps = {
  products: Product[]
  cart: CartItem[]
  increase: (p: Product) => void
  decrease: (p: Product) => void
  remove: (p: number) => void
}

export const ProductList = ({ products, cart, increase, decrease, remove }: ProductListProps) => {
  const getQty = (pid: number) => {
    return cart.find((i) => i.product.id === pid)?.qty ?? 0
  }

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden bg-white rounded-2xl border border-border divide-y divide-border overflow-hidden">
        {products.map((p) => {
          const qty = getQty(p.id)
          const selected = qty > 0

          return (
            <div key={p.id} className={selected ? 'bg-accent/5' : ''}>
              <div className="px-4">
                <ProductRow
                  product={p}
                  qty={qty}
                  onIncrease={() => increase(p)}
                  onDecrease={() => decrease(p)}
                  onRemove={() => remove(p.id)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:grid md:grid-cols-2 xl:grid-cols-3 gap-3">
        {products.map((p) => {
          const qty = getQty(p.id)
          const selected = qty > 0

          return (
            <div
              key={p.id}
              className={`
                rounded-2xl px-4
                min-h-[88px]
                transition-colors
                ${
                  selected
                    ? 'border border-accent bg-accent/5'
                    : 'border border-border bg-white hover:border-accent/40'
                }
              `}
            >
              <ProductRow
                product={p}
                qty={qty}
                onIncrease={() => increase(p)}
                onDecrease={() => decrease(p)}
                onRemove={() => remove(p.id)}
              />
            </div>
          )
        })}
      </div>
    </>
  )
}
