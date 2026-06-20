import { useParams, useNavigate } from 'react-router-dom'
import Shell from '../layouts/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { useOrders } from '../contexts/OrderContext'
import { fmtDate, getCatEmoji } from '../lib/utils'
import { AlertCircle } from 'lucide-react'
import type { OrderStatus } from '@repo/shared'
import { STATUS_CONFIG } from '../components/StatusBadge'

const AdminOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, updateStatus } = useOrders()

  const order = orders.find((o) => o.id === orderId)

  if (!order) {
    return <Shell title="Order tidak ditemukan">Order tidak ditemukan</Shell>
  }

  const nextMap: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }
  const nextStatuses = nextMap[order.status]

  const actionBar =
    nextStatuses.length > 0 ? (
      <div className="flex gap-3">
        {nextStatuses.map((s) => (
          <button
            key={s}
            onClick={() => {
              updateStatus(order.id, s)
              navigate('/admin/orders')
            }}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors active:scale-[0.98] ${
              s === 'cancelled'
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    ) : undefined

  return (
    <Shell title={order.id} showBack actionBar={actionBar}>
      <div className="max-w-2xl space-y-4">
        {/* Customer info */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Pelanggan
              </p>
              <p className="font-bold text-sm mt-1">{order.userName}</p>
              <p className="text-xs text-muted-foreground">{order.company}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="pt-3 border-t border-border">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Tanggal Order
            </p>
            <p className="text-sm font-medium mt-1">{fmtDate(order.createdAt)}</p>
          </div>
          {order.notes && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Catatan
              </p>
              <p className="text-sm mt-1">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Item Order
          </p>
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

        {/* SAP note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            Order ini akan diinput ke <strong>SAP</strong> setelah dikonfirmasi. Pastikan data
            sudah benar sebelum mengubah status.
          </p>
        </div>
      </div>
    </Shell>
  )
}

export default AdminOrderDetailPage