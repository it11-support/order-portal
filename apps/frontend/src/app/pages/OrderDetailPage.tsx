import { useParams, useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import { StatusBadge } from '@components'
import { useOrders, useCategories } from '@contexts'
import { fmtDate } from '@lib'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, loading, error } = useOrders()
  const { getCategoryIcon } = useCategories()

  const order = orders.find((o) => o.id === orderId)
  if (loading) return <Shell title="Memuat permintaan">Memuat...</Shell>

  if (!order) {
    return <Shell title="Order tidak ditemukan">Order tidak ditemukan</Shell>
  }

  return (
    <Shell title={order.id} showBack backTo={'/orders'}>
      <div className="max-w-2xl space-y-4">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <h2 className="font-bold">
          {order.kind === 'quote' ? 'Permintaan Penawaran Harga' : 'Pesanan'}
        </h2>
        {order.salesNotes && (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <h3 className="text-sm font-semibold">Tindak lanjut sales</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm">{order.salesNotes}</p>
          </div>
        )}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Status
              </p>
              <div className="mt-1.5">
                <StatusBadge status={order.status} kind={order.kind} />
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Tanggal
              </p>
              <p className="text-xs font-semibold mt-1">{fmtDate(order.createdAt)}</p>
            </div>
          </div>
          {order.notes && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Catatan
              </p>
              <p className="text-sm">{order.notes}</p>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
          {order.items.map((item) => (
            <div key={item.product.id} className="flex items-center gap-3 py-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                {getCategoryIcon(item.product.productCategory) ? (
                  <CategoryIcon name={getCategoryIcon(item.product.productCategory)} size={20} />
                ) : (
                  '-'
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.product.itemName}</p>
                <p className="text-xs text-muted-foreground">{item.product.salesUnit}</p>
              </div>
              <span className="text-sm font-bold tabular-nums">
                {order.kind === 'quote' ? '-' : `×${item.qty}`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export default OrderDetailPage
