import { useParams, useNavigate } from 'react-router-dom'
import { Shell } from '@layouts'
import {
  StatusBadge,
  StatusSteps,
  SapStatusBadge,
  ConversationThread,
  ChatComposer,
} from '@components'
import { useOrders, useCategories, useAuth } from '@contexts'
import { fmtDate } from '@lib'
import { AlertCircle, ChevronDown, ChevronRight } from 'lucide-react'
import type { Order, OrderStatus, FollowUpNote, RequestKind } from '@repo/shared'
import { ORDER_FLOW, QUOTE_FLOW } from '@repo/shared'
import { STATUS_CONFIG } from '../components/StatusBadge'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

const LIST_PATH: Record<RequestKind, string> = { order: '/admin/orders', quote: '/admin/inquiries' }

/**
 * Which transitions belong to whom.
 *
 * Mirrors the server flow table: admin runs orders, while the negotiation of an
 * inquiry is the customer's sales person's. An inquiry is opened for ordering by
 * the price gate once every line is priced, not by a button, and admin should not
 * have to carry the customer conversation.
 */
const canMoveStatus = (
  isQuote: boolean,
  isAdmin: boolean,
  isSalesAdmin: boolean,
  status: OrderStatus,
): boolean => {
  if (status === 'cancelled') return isAdmin || isSalesAdmin
  if (!isQuote) return isAdmin
  // ready is opened by the price gate, not by a staff status edit.
  if (status === 'ready') return false
  return isAdmin || isSalesAdmin
}

const AdminOrderDetailPage = ({ kind = 'order' }: { kind?: RequestKind }) => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    orders,
    updateStatus,
    addFollowUp,
    fetchFollowUps,
    fetchOrder,
    linkSapDocument,
    followUps,
    error,
    loading,
  } = useOrders()
  const { getCategoryIcon } = useCategories()
  const [order, setOrder] = useState<Order | null>(null)
  const [orderLoading, setOrderLoading] = useState(true)
  const [noteInput, setNoteInput] = useState('')
  const [internalNote, setInternalNote] = useState(false)
  const [docEntry, setDocEntry] = useState('')
  const [posting, setPosting] = useState(false)
  // The conversation starts closed: the page is read as a document first, and a
  // negotiation thread is only worth the space once someone asks for it.
  const [threadOpen, setThreadOpen] = useState(false)

  const notes: FollowUpNote[] = followUps[orderId ?? ''] ?? []
  const threadRef = useRef<HTMLDivElement>(null)

  /**
   * Opening the thread from the button scrolls it into view, so the tap lands
   * on the messages rather than leaving them collapsed above the fold.
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
      const existingOrder = orders.find((o) => o.id === orderId)
      if (existingOrder) {
        setOrder(existingOrder)
      } else {
        const fetchedOrder = await fetchOrder(orderId)
        setOrder(fetchedOrder)
      }
      await fetchFollowUps(orderId)
      setOrderLoading(false)
    }
    loadOrder()
  }, [orderId, orders, fetchOrder, fetchFollowUps])

  if (loading || orderLoading) return <Shell title="Memuat permintaan">Memuat...</Shell>

  if (!order) {
    return <Shell title="Pesanan tidak ditemukan">Pesanan tidak ditemukan</Shell>
  }

  // The id belongs to the other list. The status transitions and the sales note
  // field differ between the two, so refuse rather than render the wrong form.
  if ((order.kind ?? 'order') !== kind) {
    const actual = order.kind ?? 'order'
    return (
      <Shell
        title={actual === 'quote' ? 'Permintaan penawaran' : 'Pesanan'}
        showBack
        backTo={LIST_PATH[actual]}
      >
        <div className="text-center py-12 text-muted-foreground space-y-3">
          <p className="text-sm">
            {order.id} adalah {actual === 'quote' ? 'permintaan penawaran' : 'pesanan'}, bukan{' '}
            {kind === 'quote' ? 'permintaan penawaran' : 'pesanan'}.
          </p>
          <button
            onClick={() => navigate(`${LIST_PATH[actual]}/${order.id}`)}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white"
          >
            Buka {actual === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'}
          </button>
        </div>
      </Shell>
    )
  }

  const handleSendNote = async () => {
    if (!order || !noteInput.trim()) return
    setPosting(true)
    try {
      await toast.promise(
        addFollowUp(order.id, noteInput, internalNote ? 'internal' : 'customer'),
        {
          loading: 'Mengirim pesan...',
          success: internalNote ? 'Pesan internal terkirim' : 'Pesan terkirim',
          error: 'Gagal mengirim pesan',
        },
      )
      setNoteInput('')
      // The reply belongs with the thread it answers, so a conversation that
      // just started is not left folded away behind its own button.
      setThreadOpen(true)
    } finally {
      setPosting(false)
    }
  }

  const handleStatusChange = async (status: OrderStatus) => {
    if (!order) return
    setPosting(true)
    try {
      await toast.promise(updateStatus(order.id, status), {
        loading: 'Memperbarui...',
        success: 'Status berhasil diperbarui',
        error: 'Gagal memperbarui status',
      })
      // Back to the list this request actually lives in.
      navigate(LIST_PATH[kind])
    } finally {
      setPosting(false)
    }
  }

  const isQuote = order.kind === 'quote'
  const isAdmin = user?.role.name === 'admin'
  const isSalesAdmin = user?.role.name === 'sales_admin'

  // The server owns the transition table; the UI only offers the steps this
  // role may actually take, so nobody is offered a button the API rejects.
  const nextStatuses = (isQuote ? QUOTE_FLOW : ORDER_FLOW)[order.status] ?? []

  const positiveActions = nextStatuses.filter(
    (status) => status !== 'cancelled' && canMoveStatus(isQuote, isAdmin, isSalesAdmin, status),
  )

  const canManageStatus = positiveActions.length > 0
  const canReject =
    canManageStatus && !['delivered', 'cancelled', 'converted'].includes(order.status)

  const actionLabel = (status: OrderStatus): string => {
    if (status === 'cancelled') return 'Tolak'
    if (status === 'delivered') return 'Selesai'
    if (status === 'processing') return isQuote ? 'Mulai follow up' : 'Proses'
    if (status === 'confirmed') return 'Konfirmasi'
    return STATUS_CONFIG[status].label
  }

  const actionBar =
    canManageStatus || canReject ? (
      <div className="flex flex-col sm:flex-row gap-2 justify-center">
        {canManageStatus &&
          positiveActions.map((s) => (
            <button
              key={s}
              disabled={posting}
              onClick={() => handleStatusChange(s)}
              className="w-full sm:w-auto sm:min-w-[140px] sm:px-6 py-3 rounded-xl text-sm font-bold bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors active:scale-[0.98]"
            >
              {actionLabel(s)}
            </button>
          ))}

        {canReject && (
          <button
            key="cancelled"
            disabled={posting}
            onClick={() => handleStatusChange('cancelled')}
            className="w-full sm:w-auto sm:min-w-[140px] sm:px-6 py-3 rounded-xl text-sm font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors active:scale-[0.98]"
          >
            Tolak
          </button>
        )}
      </div>
    ) : undefined

  const handleSapLink = async () => {
    if (!order) return
    const value = parseInt(docEntry, 10)
    if (!Number.isInteger(value) || value < 1) {
      toast.error('Masukkan nomor dokumen (angka).')
      return
    }
    setPosting(true)
    try {
      await toast.promise(linkSapDocument(order.id, value), {
        loading: 'Menyinkronkan dengan sistem...',
        success: 'Dokumen diproses',
        error: 'Gagal menautkan dokumen',
      })
      setDocEntry('')
      const refreshed = await fetchOrder(order.id)
      if (refreshed) setOrder(refreshed)
    } finally {
      setPosting(false)
    }
  }

  return (
    <Shell title={order.id} showBack backTo={LIST_PATH[kind]} actionBar={actionBar}>
      <div className="max-w-2xl space-y-4">
        {error && (
          <p role="alert" className="text-red-600">
            {error}
          </p>
        )}
        <h2 className="font-bold">{isQuote ? 'Permintaan Penawaran Harga' : 'Pesanan'}</h2>

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
              Tanggal
            </p>
            <p className="text-sm font-medium mt-1">{fmtDate(order.createdAt)}</p>
          </div>
          <div className="pt-3 border-t border-border space-y-2">
            <StatusSteps status={order.status} kind={order.kind} />
          </div>
          {!isQuote && (
            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Dokumen Sistem
              </p>
              <div className="flex items-center gap-2 flex-wrap">
                <SapStatusBadge sap={order.sap} />
                {order.sap?.docEntry ? (
                  <span className="text-xs text-muted-foreground font-mono">
                    No. {order.sap.docEntry}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Belum terhubung ke dokumen order di sistem internal.
                  </span>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <input
                    value={docEntry}
                    onChange={(e) => setDocEntry(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="Nomor dokumen"
                    className="w-40 rounded-xl border border-border bg-input-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="button"
                    onClick={handleSapLink}
                    disabled={posting || !docEntry}
                    className="rounded-xl border border-border px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
                  >
                    {order.sap?.docEntry ? 'Perbarui tautan' : 'Tautkan'}
                  </button>
                </div>
              )}
            </div>
          )}
          {order.source === 'sales' && (
            <div className="pt-3 border-t border-border">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                Dibuat oleh
              </p>
              <p className="text-sm font-medium mt-1">
                Sales: {order.createdByName ?? 'tidak diketahui'}
              </p>
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
                </div>
                <span className="text-sm font-bold tabular-nums">
                  {isQuote ? '-' : `×${item.qty}`}
                </span>
              </div>
            ))}
            {order.items.length === 0 && (
              <p className="text-sm text-muted-foreground py-4">
                {order.source === 'sap'
                  ? 'Baris item belum tersinkron dari sistem. Yang tampil baru header dokumennya.'
                  : 'Belum ada item pada pesanan ini.'}
              </p>
            )}
          </div>
        </div>

        {/* The customer's own words, kept apart from the negotiation so a staff
            reader is not tempted to treat it as the agreed price. */}
        {order.notes && (
          <div className="bg-white rounded-2xl border border-border p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Catatan Customer
            </p>
            <p className="text-sm mt-1 whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        {/* The thread and the reply box share one card: a conversation and the way to
            answer it are the same thing, and splitting them made the page read
            as two unrelated sections. */}
        <div className="bg-white rounded-2xl border border-border p-4">
          <button
            type="button"
            onClick={toggleThread}
            aria-expanded={threadOpen}
            className="w-full flex items-center justify-between gap-2 text-left"
          >
            <span className="text-sm font-bold">
              Follow up
              {notes.length > 0 && (
                <span className="ml-1.5 font-semibold text-muted-foreground">{notes.length}</span>
              )}
            </span>
            {threadOpen ? (
              <ChevronDown size={16} className="text-muted-foreground" />
            ) : (
              <ChevronRight size={16} className="text-muted-foreground" />
            )}
          </button>
          {threadOpen && (
            <>
              <div
                ref={threadRef}
                className="mt-3 border border-border rounded-xl p-3 min-h-[160px] max-h-[420px] overflow-y-auto"
              >
                <ConversationThread
                  notes={notes}
                  viewerId={user?.id}
                  emptyLabel="Belum ada pesan."
                />
              </div>
              <ChatComposer
                className="mt-3"
                value={noteInput}
                onChange={setNoteInput}
                onSubmit={handleSendNote}
                disabled={posting}
                placeholder={
                  internalNote
                    ? 'Pesan internal (tidak dilihat customer)...'
                    : isQuote && order.status === 'pending'
                      ? 'Tuliskan harga / penawaran...'
                      : 'Ketik pesan...'
                }
                header={
                  <div className="mb-1.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setInternalNote(false)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        internalNote
                          ? 'bg-white text-muted-foreground border-border'
                          : 'bg-accent text-white border-accent'
                      }`}
                    >
                      Untuk customer
                    </button>
                    <button
                      type="button"
                      onClick={() => setInternalNote(true)}
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                        internalNote
                          ? 'bg-amber-100 text-amber-800 border-amber-300'
                          : 'bg-white text-muted-foreground border-border'
                      }`}
                    >
                      Internal saja
                    </button>
                  </div>
                }
              />
            </>
          )}
        </div>

        {/* Info note */}
        <div className="-mt-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
          <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 leading-relaxed">
            {isQuote
              ? 'Pesan "Untuk customer" terlihat oleh customer secara real-time, pesan "Internal saja" hanya untuk tim. Alur inquiry: Negosiasi sales → admin memperbarui harga di sistem → inquiry otomatis siap dipesan.'
              : isAdmin
                ? 'Admin mengelola pesanan ini. Pembuatan dokumen di sistem internal dilakukan oleh tim sales setelah konfirmasi.'
                : 'Sales dapat membuat pesanan untuk pelanggannya dari menu Input Order, dan hanya mengelola status inquiry (penawaran), bukan order.'}
          </p>
        </div>
      </div>
    </Shell>
  )
}

export default AdminOrderDetailPage
