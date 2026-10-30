import { ClipboardList, MessageSquareQuote } from 'lucide-react'
import { Loader, StatusBadge } from '@components'
import { STATUS_CONFIG } from '../StatusBadge'
import { SapStatusBadge } from '@components'
import { useOrders } from '../../contexts/OrderContext'
import { fmtDate } from '@lib'
import { useNavigate } from 'react-router-dom'
import type { OrderStatus, RequestKind } from '@repo/shared'
import { useState, useMemo } from 'react'
import { Shell } from '@layouts'

const COPY: Record<RequestKind, { title: string; empty: string; list: string; eyebrow: string }> = {
  order: {
    title: 'Admin — Pesanan',
    empty: 'Tidak ada pesanan',
    list: 'orders',
    eyebrow: 'Pesanan',
  },
  quote: {
    title: 'Admin — Permintaan Penawaran',
    empty: 'Tidak ada permintaan penawaran',
    list: 'inquiries',
    eyebrow: 'Permintaan Penawaran Harga',
  },
}

const AdminOrdersPage = ({ kind = 'order' }: { kind?: RequestKind }) => {
  const { orders, loading, error } = useOrders()
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const copy = COPY[kind]

  const rows = useMemo(
    () => orders.filter((order) => (order.kind ?? 'order') === kind),
    [orders, kind],
  )
  const filteredOrders = useMemo(
    () => rows.filter((o) => statusFilter === 'all' || o.status === statusFilter),
    [rows, statusFilter],
  )

  const allStatuses: (OrderStatus | 'all')[] =
    kind === 'quote'
      ? ['all', 'pending', 'processing', 'ready', 'converted', 'cancelled']
      : ['all', 'pending', 'confirmed', 'processing', 'delivered', 'cancelled']

  const EmptyIcon = kind === 'quote' ? MessageSquareQuote : ClipboardList

  return (
    <Shell title={copy.title} showBack={false}>
      <div className="space-y-4">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        {loading && <Loader label="Memuat permintaan..." />}

        {/* Stats row — counts cover this list only */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {(kind === 'quote'
            ? (['pending', 'processing', 'ready', 'converted'] as OrderStatus[])
            : (['pending', 'confirmed', 'processing', 'delivered', 'cancelled'] as OrderStatus[])
          ).map((s) => {
            const count = rows.filter((o) => o.status === s).length
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
          })}
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

        {/* List grid */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <EmptyIcon size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">{copy.empty}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredOrders.map((order) => (
              <button
                key={order.id}
                onClick={() => navigate(`/admin/${copy.list}/${order.id}`)}
                className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <p className="text-xs font-mono font-bold">{order.id}</p>
                    <p className="text-sm font-bold mt-0.5">{order.company}</p>
                    <p className="text-xs text-muted-foreground">{order.userName}</p>
                  </div>
                  <StatusBadge status={order.status} kind={order.kind} />
                </div>
                {order.sap?.docEntry && (
                  <div className="mt-1.5">
                    <SapStatusBadge sap={order.sap} />
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">{fmtDate(order.createdAt)}</p>
                <p className="text-sm font-semibold">{copy.eyebrow}</p>
                {order.source === 'sales' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dibuat sales{order.createdByName ? `: ${order.createdByName}` : ''}
                  </p>
                )}
                {order.source === 'sap' && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dari dokumen sistem{order.sap?.docNum ? ` ${order.sap.docNum}` : ''}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.items.length} produk ·{' '}
                  {kind === 'quote'
                    ? '-'
                    : `${order.items.reduce((s, i) => s + (i.qty ?? 0), 0)} qty`}
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
