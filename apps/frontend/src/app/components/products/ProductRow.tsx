import { Product } from '@repo/shared'
import { CATEGORIES } from '@lib'
import { QtyControl } from '../QtyControl'

const getCatEmoji = (catId: string) => {
  return CATEGORIES.find((c) => c.id === catId)?.emoji ?? '📦'
}

type ProductRowProps = {
  product: Product
  qty: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export const ProductRow = ({ product, qty, onIncrease, onDecrease, onRemove }: ProductRowProps) => {
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
        {getCatEmoji(product.category)}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>

        <p className="text-xs text-muted-foreground mt-0.5">
          {product.unit} · min. {product.minOrder}
        </p>
      </div>

      <QtyControl
        product={product}
        qty={qty}
        onIncrease={onIncrease}
        onDecrease={onDecrease}
        onRemove={onRemove}
      />
    </div>
  )
}

export default ProductRow
