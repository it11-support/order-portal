import { ClipboardList, MessageSquareQuote } from 'lucide-react'
import { Shell } from '@layouts'
import { Loader, StatusBadge, SapStatusBadge } from '@components'
import { useOrders } from '@contexts'
import { fmtDate } from '@lib'
import { useNavigate } from 'react-router-dom'
import type { RequestKind } from '@repo/shared'

const COPY: Record<
  RequestKind,
  { title: string; empty: string; emptyHint: string; list: string }
> = {
  order: {
    title: 'Order Saya',
    empty: 'Belum ada order',
    emptyHint: 'Order Anda akan muncul di sini',
    list: 'orders',
  },
  quote: {
    title: 'Penawaran Harga',
    empty: 'Belum ada permintaan penawaran',
    emptyHint: 'Ajukan penawaran untuk produk yang belum pernah Anda beli',
    list: 'inquiries',
  },
}

const OrdersPage = ({ kind = 'order' }: { kind?: RequestKind }) => {
  const { orders, loading, error } = useOrders()
  const navigate = useNavigate()
  const copy = COPY[kind]

  // The API scopes these requests to the authenticated customer; the split by
  // kind is what this page adds on top.
  const rows = orders.filter((order) => (order.kind ?? 'order') === kind)
  const EmptyIcon = kind === 'quote' ? MessageSquareQuote : ClipboardList

  return (
    <Shell title={copy.title} showBack={true}>
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      {loading && <Loader label="Memuat permintaan..." />}
      {!loading && rows.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <EmptyIcon size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-foreground">{copy.empty}</p>
          <p className="text-sm mt-1">{copy.emptyHint}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((order) => (
            <button
              key={order.id}
              onClick={() => navigate(`/${copy.list}/${order.id}`)}
              className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
            >
<div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold">{order.id}</span>
                  <StatusBadge status={order.status} kind={order.kind} />
                </div>
                {order.sap?.docEntry && (
                  <div className="mb-2">
                    <SapStatusBadge sap={order.sap} />
                  </div>
                )}
              <p className="text-xs text-muted-foreground mb-2">{fmtDate(order.createdAt)}</p>
              <p className="text-sm font-semibold mb-2">
                {kind === 'quote' ? 'Permintaan Penawaran Harga' : 'Pesanan'}
              </p>
              {order.source === 'sales' && (
                <p className="text-xs text-muted-foreground mb-2">
                  Dibuat oleh sales{order.createdByName ? ` ${order.createdByName}` : ''}
                </p>
              )}
              {order.source === 'sap' && (
                <p className="text-xs text-muted-foreground mb-2">
                  Dari dokumen sistem{order.sap?.docNum ? ` ${order.sap.docNum}` : ''}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5">
                {order.items.slice(0, 2).map((i) => (
                  <span
                    key={i.product.id}
                    className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full"
                  >
                    {i.product.itemName} {kind === 'quote' ? '' : `×${i.qty}`}
                  </span>
                ))}
                {order.items.length > 2 && (
                  <span className="text-xs text-muted-foreground self-center">
                    +{order.items.length - 2} lainnya
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </Shell>
  )
}

export default OrdersPage
