import { Product } from '@repo/shared'
import { QtyControl } from '../QtyControl'
import { useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

type ProductRowProps = {
  product: Product
  onContactSales?: (product: Product) => void
}

const formatPrice = (price: number, currency: string | null) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 2,
  }).format(price)

export const ProductRow = ({ product, onContactSales }: ProductRowProps) => {
  const { getCategoryIcon } = useCategories()
  const iconName = getCategoryIcon(product.productCategory)
  const hasPrice = typeof product.price === 'number' && product.price > 0
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-start gap-3 py-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
          {iconName ? <CategoryIcon name={iconName} size={20} /> : '-'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{product.itemName}</p>

          <p className="text-xs text-muted-foreground mt-0.5">{product.salesPackUnit}</p>
          {hasPrice && (
            <>
              <p className="text-xs font-bold text-foreground mt-1">
                {formatPrice(product.price!, product.currency ?? null)}
                {product.salesUnit ? ` / ${product.salesUnit}` : ''}
              </p>
              {/* Repeat items are sold at the price this customer already pays;
                  anything else is still on the price list. */}
              <p className="text-[10px] text-muted-foreground">
                {product.priceSource === 'actual'
                  ? 'Harga aktual'
                  : product.priceSource === 'pricelist'
                    ? 'Harga price list'
                    : null}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="mt-auto flex justify-end pb-3">
        <QtyControl product={product} />
      </div>
    </div>
  )
}

export default ProductRow
