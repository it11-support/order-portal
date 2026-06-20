import { ClipboardList } from 'lucide-react'
import Shell from '../layouts/Shell'
import { StatusBadge } from '../components/StatusBadge'
import { useOrders } from '../contexts/OrderContext'
import { fmtDate } from '../lib/utils'
import { useNavigate } from 'react-router-dom'

const OrdersPage = () => {
  const { orders } = useOrders()
  const navigate = useNavigate()

  // Filter orders for current user (mock - in real app would use auth user id)
  const userOrders = orders.filter((o) => o.userId === 'u1')

  return (
    <Shell title="Riwayat Order" showBack={true}>
      {userOrders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-foreground">Belum ada order</p>
          <p className="text-sm mt-1">Order Anda akan muncul di sini</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
          {userOrders.map((order) => (
            <button
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="bg-white rounded-2xl border border-border p-4 text-left hover:border-accent/50 active:scale-[0.99] transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold">{order.id}</span>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-muted-foreground mb-2">{fmtDate(order.createdAt)}</p>
              <div className="flex flex-wrap gap-1.5">
                {order.items.slice(0, 2).map((i) => (
                  <span
                    key={i.product.id}
                    className="text-xs bg-secondary text-foreground px-2 py-0.5 rounded-full"
                  >
                    {i.product.name} ×{i.qty}
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
