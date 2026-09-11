import { useParams, useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import { StatusBadge } from '@components'
import { useOrders, useCategories, useNotifications } from '@contexts'
import { fmtDate } from '@lib'
import { AlertCircle } from 'lucide-react'
import type { Order, OrderStatus } from '@repo/shared'
import { STATUS_CONFIG } from '../components/StatusBadge'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { useState, useEffect } from 'react'
import { QUOTE_STATUS_LABELS } from '../components/StatusBadge'
import { toast } from 'sonner'

const AdminOrderDetailPage = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, updateStatus, loading, error, fetchOrder } = useOrders()
  const { getCategoryIcon } = useCategories()
  const { notifications, markRead } = useNotifications()
  const [salesNotes, setSalesNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)

  useEffect(() => {
    setSalesNotes(order?.salesNotes ?? '')
  }, [order?.id, order?.salesNotes])

  useEffect(() => {
    if (!orderId) return
    const relatedNotifications = notifications.filter((n) => n.relatedId === orderId && !n.read)
    relatedNotifications.forEach((n) => markRead(n.id))
  }, [orderId, notifications, markRead])

  useEffect(() => {
    const loadOrder = async () => {
      setOrderLoading(true)
      // First check if order is already in the list
      const existingOrder = orders.find((o) => o.id === orderId)
      if (existingOrder) {
        setOrder(existingOrder)
      } else {
        // Fetch from API if not in list
        const fetchedOrder = await fetchOrder(orderId!)
        setOrder(fetchedOrder)
      }
      setOrderLoading(false)
    }
    loadOrder()
  }, [orderId, orders, fetchOrder])

  if (loading || orderLoading) return <Shell title="Memuat permintaan">Memuat...</Shell>

  if (!order) {
    return <Shell title="Order tidak ditemukan">Order tidak ditemukan</Shell>
  }

  const handleSaveNotes = async (status: OrderStatus) => {
    setSaving(true)
    try {
      await toast.promise(updateStatus(order.id, status, salesNotes), {
        loading: 'Menyimpan perubahan...',
        success: 'Status berhasil diperbarui',
        error: 'Gagal memperbarui status',
      })
      navigate('/admin/orders')
    } finally {
      setSaving(false)
    }
  }

  const nextMap: Record<OrderStatus, OrderStatus[]> = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['processing', 'cancelled'],
    processing: ['delivered', 'cancelled'],
    delivered: [],
    cancelled: [],
  }
  const nextStatuses =
    order.kind === 'quote'
      ? (
          {
            pending: ['processing', 'cancelled'],
            processing: ['confirmed', 'cancelled'],
            confirmed: ['delivered', 'cancelled'],
            delivered: [],
            cancelled: [],
          } as Record<OrderStatus, OrderStatus[]>
        )[order.status]
      : nextMap[order.status]

  const actionBar =
    nextStatuses.length > 0 ? (
      <div className="flex gap-3 justify-center">
        {nextStatuses.map((s) => (
          <button
            key={s}
            disabled={saving}
            onClick={() => handleSaveNotes(s)}
            className={`w-full sm:w-auto sm:min-w-[140px] sm:px-6 py-3 rounded-xl text-sm font-bold transition-colors active:scale-[0.98] ${
              s === 'cancelled'
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'
                : 'bg-accent text-white hover:bg-accent/90'
            }`}
          >
            {order.kind === 'quote' ? QUOTE_STATUS_LABELS[s] : STATUS_CONFIG[s].label}
          </button>
        ))}
      </div>
    ) : undefined

  return (
    <Shell title={order.id} showBack actionBar={actionBar}>
      <div className="max-w-2xl space-y-4">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <h2 className="font-bold">
          {order.kind === 'quote' ? 'Permintaan Penawaran Harga' : 'Pesanan'}
        </h2>
        <div className="rounded-xl border border-border bg-white p-4 space-y-2">
          <p className="text-sm">
            Customer: {order.cardCode} · Kontak: {order.phone || '-'}
          </p>
          <label className="block text-sm">
            Catatan tindak lanjut / penawaran harga (terlihat oleh customer)
            <textarea
              maxLength={5000}
              value={salesNotes}
              onChange={(e) => setSalesNotes(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
              rows={4}
            />
          </label>
          <button
            type="button"
            disabled={saving}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={async () => {
              setSaving(true)
              try {
                await toast.promise(updateStatus(order.id, order.status, salesNotes), {
                  loading: 'Menyimpan catatan...',
                  success: 'Catatan berhasil disimpan',
                  error: 'Gagal menyimpan catatan',
                })
              } catch {
                /* Error is shown above. */
              } finally {
                setSaving(false)
              }
            }}
          >
            Simpan catatan
          </button>
        </div>
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
            <StatusBadge status={order.status} kind={order.kind} />
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

        {/* SAP note */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            {order.kind === 'quote'
              ? 'Hubungi customer untuk konfirmasi harga. Permintaan penawaran ini belum menjadi pesanan.'
              : 'Pesanan ini tersimpan di portal. Pembuatan dokumen SAP dilakukan oleh tim sales setelah konfirmasi.'}
          </p>
        </div>
      </div>
    </Shell>
  )
}

export default AdminOrderDetailPage
