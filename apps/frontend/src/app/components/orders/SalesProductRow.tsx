import { memo } from 'react'
import { CheckCircle2 } from 'lucide-react'
import type { Product } from '@repo/shared'
import { QtyControl } from '@components'
import { formatRupiah } from '@/lib/formatCurrency'

type SalesProductRowProps = {
  product: Product
  qty: number
  cardcode?: string
  onAdd: (product: Product, qty: number) => void
  onQtyChange: (productId: string, qty: number) => void
  onRemove: (productId: string) => void
  onDialogClose: () => void
}

const formatLastPurchaseDate = (date?: Date | string | null) => {
  if (!date) return null

  const parsedDate = new Date(date)
  if (Number.isNaN(parsedDate.getTime())) return null

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  }).format(parsedDate)
}

export const SalesProductRow = memo(
  ({
    product,
    qty,
    cardcode,
    onAdd,
    onQtyChange,
    onRemove,
    onDialogClose,
  }: SalesProductRowProps) => {
    const existing = qty > 0

    return (
      <div
        className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
          existing ? 'bg-slate-50' : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug text-slate-800">
              {product.itemName}
            </p>

            {product.lastInvoiceDate && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Terakhir dibeli: {formatLastPurchaseDate(product.lastInvoiceDate)}
              </p>
            )}
          </div>

          {existing && <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-bold tabular-nums text-slate-900">
            {typeof product.price === 'number'
              ? formatRupiah(product.price)
              : 'Harga belum tersedia'}
          </span>

          <QtyControl
            product={product}
            cardcode={cardcode}
            listMode
            qty={qty}
            onAdd={(pricedProduct, amount) => onAdd(pricedProduct, amount ?? 1)}
            onQtyChange={(id, amount) => onQtyChange(String(id), amount)}
            onIncrease={(p) => onQtyChange(String(p.id), qty + 1)}
            onDecrease={(p) => {
              if (qty <= 1) {
                onRemove(String(p.id))
              } else {
                onQtyChange(String(p.id), qty - 1)
              }
            }}
            onRemove={(id) => onRemove(String(id))}
            onDialogClose={onDialogClose}
          />
        </div>
      </div>
    )
  },
)

SalesProductRow.displayName = 'SalesProductRow'
