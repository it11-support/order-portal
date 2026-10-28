import { useParams, useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import { Loader, StatusBadge, StatusSteps, SapStatusBadge, ChatComposer } from '@components'
import { useOrders, useCategories, useCart, useAuth } from '@contexts'
import { fmtDate } from '@lib'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { useEffect, useRef, useState } from 'react'
import type { Order, FollowUpNote, RequestKind } from '@repo/shared'
import { toast } from 'sonner'
import { ShoppingCart } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import OrderKindMismatch from '../components/orders/OrderKindMismatch'
import FollowUpThread from '../components/orders/FollowUpThread'

const LIST_PATH: Record<RequestKind, string> = { order: '/orders', quote: '/inquiries' }

const OrderDetailPage = ({ kind = 'order' }: { kind?: RequestKind }) => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { orders, loading, error, fetchOrder, fetchFollowUps, followUps, addFollowUp } = useOrders()
  const { getCategoryIcon } = useCategories()
  const { setCart, setInquiryId } = useCart()
  const { user } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [posting, setPosting] = useState(false)
  const [threadOpen, setThreadOpen] = useState(false)
  const threadRef = useRef<HTMLDivElement>(null)

  const notes: FollowUpNote[] = followUps[orderId ?? ''] ?? []

  /**
   * Opening the thread scrolls it into view, so the tap lands on the messages
   * rather than leaving them folded away.
   */
  const toggleThread = () => {
    setThreadOpen((open) => !open)
    if (threadOpen) return
    requestAnimationFrame(() =>
      threadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }),
    )
  }

  // Notifications are not cleared on visit. Opening a page is not an explicit
  // "I have seen this", so the badge keeps counting until the user opens the
  // notification itself or dismisses it.

  useEffect(() => {
    const loadOrder = async () => {
      if (!orderId) return
      setOrderLoading(true)
      const existing = orders.find((o) => o.id === orderId)
      if (existing) {
        setOrder(existing)
      } else {
        const fetched = await fetchOrder(orderId)
        setOrder(fetched)
      }
      await fetchFollowUps(orderId)
      setOrderLoading(false)
    }
    loadOrder()
  }, [orderId, orders, fetchOrder, fetchFollowUps])

  if (loading || orderLoading)
    return (
      <Shell title="Memuat permintaan">
        <Loader />
      </Shell>
    )

  if (!order) {
    return <Shell title="Pesanan tidak ditemukan">Pesanan tidak ditemukan</Shell>
  }

  if ((order.kind ?? 'order') !== kind) {
    return (
      <OrderKindMismatch
        orderId={order.id}
        actualKind={order.kind ?? 'order'}
        expectedKind={kind}
      />
    )
  }

  const isQuote = order.kind === 'quote'
  // An inquiry opens for ordering by itself once every line is priced, so there
  // is nothing here for the customer to accept and no button to press.
  const canBuy = isQuote && order.status === 'ready' && order.items.length > 0
  const buyLabel = 'Beli dengan harga terbaru'

  const handleSendNote = async () => {
    if (!order || !noteInput.trim()) return
    setPosting(true)
    try {
      await toast.promise(addFollowUp(order.id, noteInput), {
        loading: 'Mengirim...',
        success: 'Pesan terkirim',
        error: 'Gagal mengirim',
      })
      setNoteInput('')
      // The reply belongs with the thread it answers, so a conversation that
      // just started is not left folded away behind its own button.
      setThreadOpen(true)
    } finally {
      setPosting(false)
    }
  }

  const handleBuy = async () => {
    if (!order) return
    // Carry the quoted line price into the cart. The order is then placed
    // against that price, and the server only holds it if the price rose again.
    const cartItems = order.items.map((item) => ({
      product: { ...item.product, price: item.price ?? item.product.price ?? null },
      qty: item.qty ?? 1,
      acceptedPrice: item.price ?? null,
    }))
    setCart(cartItems)
    // Keep the link to this inquiry so the resulting order closes the loop.
    setInquiryId(order.id)
    navigate('/cart')
  }

  return (
    <Shell title={order.id} showBack backTo={LIST_PATH[kind]}>
      <div className="max-w-2xl space-y-4">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <h2 className="font-bold">{isQuote ? 'Permintaan Penawaran Harga' : 'Pesanan'}</h2>

        {/* Status & details */}
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
          <div className="pt-3 border-t border-border space-y-2">
            <StatusSteps status={order.status} kind={order.kind} />
            {!isQuote && <SapStatusBadge sap={order.sap} />}
          </div>
          {order.notes && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                Catatan
              </p>
              <p className="text-sm whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}
        </div>

        {/* Items */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Item {isQuote ? 'Penawaran' : 'Order'}
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
                  {typeof item.price === 'number' && (
                    <p className="text-xs font-semibold mt-0.5">
                      {formatRupiah(item.price)}
                      <span className="ml-1 font-normal text-muted-foreground">
                        {item.priceSource === 'actual' ? 'harga aktual' : 'harga price list'}
                      </span>
                    </p>
                  )}
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {isQuote ? '-' : `×${item.qty}`}
                </span>
              </div>
            ))}
            {order.items.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                {order.source === 'sap'
                  ? 'Rincian produk belum tersinkron dari sistem internal. Hubungi tim sales bila Anda membutuhkan rinciannya.'
                  : 'Belum ada item pada pesanan ini.'}
              </p>
            )}
          </div>
        </div>

        <FollowUpThread
          notes={notes}
          viewerId={user?.id}
          open={threadOpen}
          onToggle={toggleThread}
          threadRef={threadRef}
          emptyLabel="Belum ada pesan dari sales."
        >
          <ChatComposer
            className="mt-3"
            value={noteInput}
            onChange={setNoteInput}
            onSubmit={handleSendNote}
            placeholder="Ketik pertanyaan..."
            disabled={posting}
          />
        </FollowUpThread>

        {/* Ordering opens by itself once the price is in the system, so the
            button is the only thing on this page that needs a decision. */}
        {canBuy && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <button
              type="button"
              onClick={handleBuy}
              className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingCart size={16} />
              {buyLabel}
            </button>
          </div>
        )}
      </div>
    </Shell>
  )
}

export default OrderDetailPage
