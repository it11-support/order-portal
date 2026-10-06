import { ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react'
import { Shell } from '@layouts'
import { useState, useEffect } from 'react'
import { QtyControl } from '@components'
import { useCart, useOrders, useCategories } from '@contexts'
import { PriceIncreasedError } from '@/app/contexts/OrderContext'
import type { PriceChange } from '@repo/shared'
import { toast } from 'sonner'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

const formatIDR = (value: number, currency: string | null) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 2,
  }).format(value)

const CartPage = () => {
  const { cart, setCart, cartQty, inquiryId, setInquiryId } = useCart()
  const { placeOrder, orderPlaced, setOrderPlaced, submitting, error } = useOrders()
  const { getCategoryIcon } = useCategories()
  const [orderNotes, setOrderNotes] = useState('')
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])

  useEffect(() => {
    setOrderPlaced(false)
  }, [setOrderPlaced])

  const total = cart.reduce((sum, item) => {
    const price = item.acceptedPrice ?? item.product.price ?? 0
    return sum + price * (item.qty ?? 0)
  }, 0)

  const submit = async (priceAccepted: boolean) => {
    try {
      await placeOrder(cart, orderNotes, setOrderNotes, () => setCart([]), {
        priceAccepted,
        inquiryId,
      })
      setInquiryId(null)
      setPriceChanges([])
      return true
    } catch (e) {
      // A held order is a decision, not a failure. Keep the basket intact so
      // the customer can accept the new price or step away.
      if (e instanceof PriceIncreasedError) {
        setPriceChanges(e.changes)
        return false
      }
      return false
    }
  }

  const handlePlaceOrder = async () => {
    try {
      await toast.promise(submit(false), {
        loading: 'Mengirim order...',
        success: 'Order berhasil dikirim',
        error: 'Gagal mengirim order',
      })
    } catch {
      /* Error is displayed below. */
    }
  }

  const handleAcceptNewPrice = async () => {
    try {
      await toast.promise(submit(true), {
        loading: 'Mengirim order...',
        success: 'Order dikirim dengan harga terbaru',
        error: 'Gagal mengirim order',
      })
    } catch {
      /* Error is displayed below. */
    }
  }

  const cartActionBar =
    cart.length > 0 ? (
      orderPlaced ? (
        <div className="flex items-center justify-center gap-2 bg-green-500 text-white py-3.5 rounded-xl font-bold text-sm">
          <CheckCircle size={17} /> Order berhasil dikirim!
        </div>
      ) : (
        <div className="flex justify-center">
          <button
            onClick={handlePlaceOrder}
            disabled={submitting}
            className="bg-accent text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 active:scale-[0.98] transition-all"
          >
            Kirim Order ({cartQty})
          </button>
        </div>
      )
    ) : undefined

  return (
    <Shell title="Keranjang" showBack actionBar={cartActionBar}>
      {inquiryId && (
        <p className="mb-3 rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          Pesanan ini berasal dari inquiry{' '}
          <span className="font-mono font-bold text-foreground">{inquiryId}</span>.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {error}
        </p>
      )}
      {orderPlaced && (
        <p role="status" className="mb-3 rounded-xl bg-green-50 p-3 text-sm text-green-700">
          Pesanan berhasil dikirim. Lihat status pada menu Order.
        </p>
      )}
      {cart.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ShoppingCart size={52} className="mx-auto mb-4 opacity-20" />
          <p className="font-semibold text-foreground">Keranjang kosong</p>
          <p className="text-sm mt-1">Tambahkan produk dari katalog</p>
        </div>
      ) : (
        <div className="space-y-4 max-w-2xl">
          {/* Items */}
          <div className="bg-white rounded-2xl border border-border divide-y divide-border px-4">
            {cart.map((item) => {
              const price = item.acceptedPrice ?? item.product.price ?? null
              return (
                <div key={item.product.id} className="flex items-center gap-3 py-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                    {getCategoryIcon(item.product.productCategory) ? (
                      <CategoryIcon
                        name={getCategoryIcon(item.product.productCategory)!}
                        size={20}
                      />
                    ) : (
                      '-'
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">{item.product.itemName}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {price !== null ? (
                        <>
                          {formatIDR(price, item.product.currency ?? null)} /{' '}
                          {item.product.salesUnit ?? 'unit'}
                        </>
                      ) : (
                        'Harga tersedia upon request'
                      )}
                    </p>
                  </div>
                  <QtyControl product={item.product} />
                </div>
              )
            })}
          </div>
          {/* Notes */}
          <div className="bg-white rounded-2xl border border-border p-4">
            <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
              Catatan Pengiriman
            </label>
            <textarea
              value={orderNotes}
              onChange={(e) => setOrderNotes(e.target.value)}
              placeholder="Contoh: Delivery sebelum jam 8 pagi, sertakan invoice..."
              rows={3}
              className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>
          {/* Summary */}
          <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total jenis produk</span>
              <span className="font-bold">{cart.length} item</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total qty</span>
              <span className="font-bold">{cartQty} unit</span>
            </div>
            {total > 0 && (
              <div className="flex justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Total harga</span>
                <span className="font-bold">{formatIDR(total, cart[0]?.product.currency ?? null)}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
                <h2 id="price-increase-title" className="text-base font-bold text-foreground">
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
                    <span className="line-through">
                      {formatIDR(change.oldPrice, change.currency)}
                    </span>{' '}
                    → <span className="font-semibold text-foreground">
                      {formatIDR(change.newPrice, change.currency)}
                    </span>{' '}
                    <span className="font-semibold text-red-600">
                      (+{change.changePct.toFixed(1)}%)
                    </span>
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => setPriceChanges([])}
                disabled={submitting}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={handleAcceptNewPrice}
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