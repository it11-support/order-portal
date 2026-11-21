import type { Order } from '@repo/shared'
import { useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { formatRupiah } from '@/lib/formatCurrency'

type OrderItemsListProps = {
  items: Order['items']
  source: Order['source']
  isQuote: boolean
  variant?: 'customer' | 'admin'
}

const OrderItemsList = ({ items, source, isQuote, variant = 'customer' }: OrderItemsListProps) => {
  const { getCategoryIcon } = useCategories()
  const isCustomer = variant === 'customer'

  const emptyMessage =
    source === 'sap'
      ? isCustomer
        ? 'Rincian produk belum tersinkron dari sistem internal. Hubungi tim sales bila Anda membutuhkan rinciannya.'
        : 'Baris item belum tersinkron dari sistem. Yang tampil baru header dokumennya.'
      : 'Belum ada item pada pesanan ini.'

  return (
    <div>
      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
        Item {isQuote ? 'Penawaran' : 'Order'}
      </p>

      <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
        {items.map((item) => {
          const icon = getCategoryIcon(item.product.productCategory)

          return (
            <div key={item.product.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                {icon ? <CategoryIcon name={icon} size={20} /> : '-'}
              </div>

              <div className="flex-1">
                <p className="text-sm font-semibold">{item.product.itemName}</p>

                <p className="text-xs text-muted-foreground">{item.product.salesUnit}</p>

                {isCustomer && typeof item.price === 'number' && (
                  <p className="text-xs font-semibold mt-0.5">
                    {formatRupiah(item.price)}
                    <span className="ml-1 font-normal text-muted-foreground">
                      {item.priceSource === 'actual' ? 'harga aktual' : 'harga price list'}
                    </span>
                  </p>
                )}
              </div>

              <span className="text-sm font-bold tabular-nums">
                {isQuote ? (isCustomer ? '-' : '') : `×${item.qty}`}
              </span>
            </div>
          )
        })}

        {items.length === 0 && <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>}
      </div>
    </div>
  )
}

export default OrderItemsList
