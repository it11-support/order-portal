import type { Product } from '@repo/shared'
import { QtyControl } from '../QtyControl'
import { formatRupiah } from '@/lib/formatCurrency'

type ProductRowProps = {
  product: Product
  onContactSales?: (product: Product) => void
}

type ProductPriceInfo = Product & {
  currentPrice?: number | null
  lastInvoicePrice?: number | null
  lastInvoiceBasePrice?: number | null
  priceIncreasePercent?: number | null
  priceIncreased?: boolean
}

export const ProductRow = ({ product, onContactSales }: ProductRowProps) => {
  const priceInfo = product as ProductPriceInfo

  const currentPrice = priceInfo.currentPrice ?? product.price
  const oldPrice = priceInfo.lastInvoiceBasePrice

  const hasPrice =
    typeof currentPrice === 'number' && Number.isFinite(currentPrice) && currentPrice > 0

  const increased =
    priceInfo.priceIncreased === true &&
    oldPrice != null &&
    currentPrice != null &&
    oldPrice > 0 &&
    currentPrice > oldPrice

  const increasePercent = increased ? ((currentPrice - oldPrice) / oldPrice) * 100 : null

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug text-foreground">{product.itemName}</p>

        {hasPrice && (
          <div className="mt-1">
            {increased && (
              <p className="text-xs text-muted-foreground line-through">{formatRupiah(oldPrice)}</p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-foreground">
                {formatRupiah(currentPrice)}
                {product.salesUnit ? ` / ${product.salesUnit}` : ''}
              </span>

              {increased && increasePercent !== null && (
                <span className="text-xs font-medium text-destructive">
                  +{increasePercent.toFixed(2)}%
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      <QtyControl product={product} onContactSales={onContactSales} listMode />
    </div>
  )
}

export default ProductRow
