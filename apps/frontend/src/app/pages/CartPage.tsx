import { ShoppingCart, CheckCircle, TrendingUp, Save } from 'lucide-react'
import { Shell } from '@layouts'
import { useState, useEffect, useMemo } from 'react'
import { QtyControl } from '@components'
import { useCart, useOrders, useCategories } from '@contexts'
import { PriceIncreasedError } from '@/app/contexts/OrderContext'
import type { PriceChange } from '@repo/shared'
import { toast } from 'sonner'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { formatRupiah } from '@/lib/formatCurrency'
import { api } from '@lib'
import CartDraftSection from './CartDraftSection'
import { useActiveDraft } from '../hooks/useActiveDraft'

const CartPage = () => {
  const { cart, setCart, cartQty, inquiryId, setInquiryId } = useCart()
  const { orders, refreshOrders, placeOrder, orderPlaced, setOrderPlaced, submitting, error } =
    useOrders()
  const { getCategoryIcon } = useCategories()
  const { editingDraftId, setEditingDraftId } = useActiveDraft()
  const [orderNotes, setOrderNotes] = useState('')
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [draftBusy, setDraftBusy] = useState(false)

  useEffect(() => {
    setOrderPlaced(false)
    void refreshOrders()
  }, [setOrderPlaced, refreshOrders])

  const savedDrafts = useMemo(
    () => orders.filter((o) => o.kind === 'order' && o.status === 'draft'),
    [orders],
  )
  const activeDraftExists = savedDrafts.some((o) => o.id === editingDraftId)
  const activeDraftId = activeDraftExists ? editingDraftId : null

  const total = cart.reduce((sum, item) => {
    const price = item.acceptedPrice ?? item.price ?? item.product.price ?? 0
    return sum + Number(price) * (item.qty ?? 0)
  }, 0)

  const getItems = () => {
    const unique = new Map<string, { productId: string; qty: number }>()
    for (const line of cart) {
      const qty = Number(line.qty ?? 0)
      if (Number.isSafeInteger(qty) && qty > 0) {
        unique.set(String(line.product.id), {
          productId: String(line.product.id),
          qty,
        })
      }
    }
    return [...unique.values()]
  }

  const openDraft = (id: string) => {
    const draft = savedDrafts.find((o) => o.id === id)
    if (!draft) return
    if (activeDraftId === id) return

    if (
      cart.length > 0 &&
      !window.confirm(
        'Ganti isi keranjang aktif dengan draft ini? Perubahan yang belum disimpan akan hilang.',
      )
    ) {
      return
    }
    const validItems = (draft.items ?? []).filter((item) => item.product?.id != null)
    if (validItems.length !== (draft.items ?? []).length) {
      toast.error('Sebagian produk draft tidak tersedia. Draft tidak dibuka.')
      return
    }
    setCart(
      validItems.map((item) => ({
        product: {
          ...item.product,
          id: Number(item.product.id),
          price: item.price ?? item.product.price ?? null,
          currency: item.currency ?? item.product.currency ?? null,
          priceSource: item.priceSource ?? item.product.priceSource ?? null,
        },
        qty: item.qty ?? 1,
      })),
    )
    setEditingDraftId(id)
    setPriceChanges([])
    toast.success('Draft dibuka di keranjang')
  }

  const saveActiveDraft = async (send = false) => {
    if (!activeDraftId || draftBusy || submitting) return
    const items = getItems()
    if (!items.length) {
      toast.error('Draft tidak boleh kosong. Hapus draft melalui daftar draft.')
      return
    }
    setDraftBusy(true)
    try {
      await api.patch(`/requests/${activeDraftId}`, { items })
      if (send) {
        await api.patch(`/requests/${activeDraftId}`, { status: 'pending' })
      }
      await refreshOrders()
      setCart([])
      setEditingDraftId(null)
      setPriceChanges([])
      toast.success(send ? 'Order berhasil dikirim' : 'Draft berhasil disimpan')
    } catch (e) {
      console.error('Gagal memproses draft', e)
      toast.error('Gagal memproses draft. Item tetap di keranjang.')
    } finally {
      setDraftBusy(false)
    }
  }

  const submit = async (priceAccepted: boolean): Promise<boolean> => {
    try {
      await placeOrder(cart, orderNotes, setOrderNotes, () => setCart([]), {
        priceAccepted,
        inquiryId,
      })
      setInquiryId(null)
      setPriceChanges([])
      return true
    } catch (e) {
      if (e instanceof PriceIncreasedError) setPriceChanges(e.changes)
      return false
    }
  }

  const handlePlaceOrder = async () => {
    if (activeDraftId) {
      await saveActiveDraft(true)
      return
    }
    const success = await submit(false)
    if (success) toast.success('Order berhasil dikirim')
    else if (!priceChanges.length)
      toast.error('Order belum terkirim. Periksa pesan atau konfirmasi harga.')
  }

  const handleAcceptNewPrice = async () => {
    const success = await submit(true)
    if (success) toast.success('Order dikirim dengan harga terbaru')
    else toast.error('Order belum terkirim')
  }

  const cartActionBar =
    cart.length > 0 ? (
      orderPlaced ? (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-green-500 py-3.5 text-sm font-bold text-white">
          <CheckCircle size={17} /> Order berhasil dikirim!
        </div>
      ) : (
        <div className="flex justify-center gap-2">
          {activeDraftId && (
            <button
              type="button"
              onClick={() => void saveActiveDraft()}
              disabled={submitting || draftBusy}
              className="inline-flex items-center gap-2 rounded-xl border border-accent px-4 py-3 text-sm font-bold text-accent disabled:opacity-50"
            >
              <Save size={16} /> Simpan Draft
            </button>
          )}
          <button
            type="button"
            onClick={() => void handlePlaceOrder()}
            disabled={submitting || draftBusy}
            className="rounded-xl bg-accent px-6 py-3.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting || draftBusy ? 'Memproses...' : `Kirim Order (${cartQty})`}
          </button>
        </div>
      )
    ) : undefined

  return (
    <Shell title="Keranjang" showBack actionBar={cartActionBar}>
      <div className="mx-auto max-w-2xl space-y-5 pb-8">
        <CartDraftSection activeDraftId={activeDraftId} onOpenDraft={openDraft} />

        {activeDraftId && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-semibold text-amber-900">
            Cart Aktif: Draft Tersimpan — perubahan dapat disimpan atau dikirim.
          </p>
        )}

        {inquiryId && (
          <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
            Pesanan ini berasal dari inquiry{' '}
            <span className="font-mono font-bold text-foreground">{inquiryId}</span>.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {orderPlaced && (
          <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
            Pesanan berhasil dikirim. Lihat status pada menu Order.
          </p>
        )}

        {cart.length === 0 ? (
          savedDrafts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground">
              <ShoppingCart size={52} className="mx-auto mb-4 opacity-20" />
              <p className="font-semibold text-foreground">Keranjang kosong</p>
              <p className="mt-1 text-sm">Tambahkan produk dari katalog</p>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
              Pilih Lanjutkan pada salah satu draft untuk mengedit pesanannya.
            </p>
          )
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-white px-4 divide-y divide-border">
              {cart.map((item) => {
                const price = item.acceptedPrice ?? item.price ?? item.product.price ?? null
                const icon = getCategoryIcon(item.product.productCategory)
                return (
                  <div key={item.product.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                      {icon ? <CategoryIcon name={icon} size={20} /> : '-'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-tight">{item.product.itemName}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {price != null
                          ? `${formatRupiah(price)} / ${item.product.salesUnit ?? 'unit'}`
                          : 'Harga belum tersedia'}
                      </p>
                    </div>
                    <QtyControl product={item.product} />
                  </div>
                )
              })}
            </div>
            <div className="rounded-2xl border border-border bg-white p-4">
              <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Catatan Pengiriman
              </label>
              <textarea
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="Contoh: Delivery sebelum jam 8 pagi, sertakan invoice..."
                rows={3}
                className="w-full resize-none rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div className="space-y-2 rounded-2xl border border-border bg-white p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total jenis produk</span>
                <span className="font-bold">{cart.length} item</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total qty</span>
                <span className="font-bold">{cartQty} unit</span>
              </div>
              {total > 0 && (
                <div className="flex justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">Perkiraan total</span>
                  <span className="font-bold">{formatRupiah(total)}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Harga akhir dapat berubah sesuai diskon, pajak, dan ketentuan lainnya.
              </p>
            </div>
          </div>
        )}
      </div>

      {priceChanges.length > 0 && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="price-increase-title"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 shrink-0 text-amber-600" size={22} />
              <div className="min-w-0">
                <h2 id="price-increase-title" className="text-base font-bold">
                  Harga sudah naik
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Harga berikut berubah sejak terakhir Anda lihat. Pesanan hanya diproses setelah
                  Anda mengonfirmasi harga terbaru.
                </p>
              </div>
            </div>
            <ul className="mt-4 divide-y divide-border rounded-xl border border-border">
              {priceChanges.map((change) => (
                <li key={change.productId} className="px-3 py-2.5">
                  <p className="text-sm font-semibold">{change.itemName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <span className="line-through">{formatRupiah(change.oldPrice)}</span> →{' '}
                    <span className="font-semibold">{formatRupiah(change.newPrice)}</span>{' '}
                    <span className="font-semibold text-red-600">
                      (+{change.changePct.toFixed(1)}%)
                    </span>
                  </p>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setPriceChanges([])}
                disabled={submitting}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => void handleAcceptNewPrice()}
                disabled={submitting}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {submitting ? 'Mengirim...' : 'Setujui & Kirim'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

export default CartPage
