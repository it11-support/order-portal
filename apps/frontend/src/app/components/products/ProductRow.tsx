import { Product } from '@repo/shared'
import { QtyControl } from '../QtyControl'
import { useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

type ProductRowProps = {
  product: Product
}

export const ProductRow = ({ product }: ProductRowProps) => {
  const { getCategoryIcon } = useCategories()
  const iconName = getCategoryIcon(product.productCategory)
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-3 py-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
          {iconName ? <CategoryIcon name={iconName} size={20} /> : '-'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{product.itemName}</p>

          <p className="text-xs text-muted-foreground mt-0.5">{product.salesPackUnit}</p>
        </div>
      </div>

      <div className="mt-auto flex justify-end pb-3">
        <QtyControl product={product} />
      </div>
    </div>
  )
}

export default ProductRow
