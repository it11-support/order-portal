import { ClipboardList } from 'lucide-react'
import Shell from '../layouts/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { STATUS_CONFIG } from '../components/StatusBadge'
import { useOrders } from '../contexts/OrderContext'
import { fmtDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'
import type { OrderStatus } from '@repo/shared'
import { useState, useMemo } from 'react'

const AdminOrdersPage = () => {
  const { orders } = useOrders()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')

  const filteredOrders = useMemo(
    () => (statusFilter === 'all' ? orders : orders.filter((o) => o.status === statusFilter)),
    [orders, statusFilter],
  )

  const allStatuses: (OrderStatus | 'all')[] = [
    'all',
    'pending',
    'confirmed',
    'processing',
    'delivered',
    'cancelled',
  ]

  return (
    <Shell title="Admin — Semua Order" showBack={false}>
      <div className="space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(['pending', 'confirmed', 'processing', 'delivered', 'cancelled'] as OrderStatus[]).map(
            (s) => {
              const count = orders.filter((o) => o.status === s).length
              const cfg = STATUS_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s === statusFilter ? 'all' : s)}
                  className={`bg-white rounded-xl border p-3 text-left transition-all ${
                    statusFilter === s
                      ? 'border-accent shadow-sm shadow-accent/10'
                      : 'border-border hover:border-accent/40'
                  }`}
                >
                  <p className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-0.5">{count}</p>
                </button>
              )
            },
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {allStatuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                statusFilter === s
                  ? 'bg-accent text-white border-accent'
                  : 'bg-white text-muted-foreground border-border hover:border-accent/40'
              }`}
            >
              {s === 'all' ? 'Semua' : STATUS_CONFIG[s as OrderStatus].label}
            </button>
          ))}
        </div>

        {/* Orders grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Tidak ada order</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/admin/orders/${order.id}`)}
                className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="text-xs font-mono font-bold">{order.id}</p>
                    <p className="text-sm font-bold mt-0.5">{order.company}</p>
                    <p className="text-xs text-muted-foreground">{order.userName}</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{fmtDate(order.createdAt)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.items.length} produk · {order.items.reduce((s, i) => s + i.qty, 0)} qty
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </Shell>
  )
}

export default AdminOrdersPage