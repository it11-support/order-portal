import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../layouts/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { useOrders } from '../contexts/OrderContext'
import { fmtDate, getCatEmoji } from '../lib/utils'

const OrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders } = useOrders()

  const order = orders.find((o) => o.id === orderId)

  if (!order) {
    return <Shell title="Order tidak ditemukan">Order tidak ditemukan</Shell>
  }

  return (
    <Shell title={order.id} showBack backTo={"/orders"}>
      <div className="max-w-2xl space-y-4">
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Status
              </p>
              <div className="mt-1.5">
                <StatusBadge status={order.status} />
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
                {getCatEmoji(item.product.category)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{item.product.name}</p>
                <p className="text-xs text-muted-foreground">{item.product.unit}</p>
              </div>
              <span className="text-sm font-bold tabular-nums">×{item.qty}</span>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  )
}

export default OrderDetailPage