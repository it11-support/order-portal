import { Product } from '@repo/shared'
import { QtyControl } from '../QtyControl'
import { useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

type ProductRowProps = {
  product: Product
  qty: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

export const ProductRow = ({ product, qty, onIncrease, onDecrease, onRemove }: ProductRowProps) => {
  const { getCategoryIcon } = useCategories()
  const iconName = getCategoryIcon(product.productCategory)
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
        {iconName ? <CategoryIcon name={iconName} size={20} /> : '-'}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground leading-tight">{product.itemName}</p>

        <p className="text-xs text-muted-foreground mt-0.5">{product.salesPackUnit}</p>
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
