import { ShoppingCart, CheckCircle } from 'lucide-react'
import { Shell } from '@layouts'
import { useState } from 'react'
import { QtyControl } from '@components'
import { useCart, useOrders, useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'

const CartPage = () => {
  const { cart, increase, decrease, setCart, cartQty } = useCart()
  const { placeOrder, orderPlaced, submitting, error } = useOrders()
  const { getCategoryIcon } = useCategories()
  const [orderNotes, setOrderNotes] = useState('')

  const handlePlaceOrder = async () => {
    try {
      await placeOrder(cart, orderNotes, setOrderNotes, () => setCart([]))
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
        <button
          onClick={handlePlaceOrder}
          disabled={submitting}
          className="w-full bg-accent text-white py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 active:scale-[0.98] transition-all"
        >
          Kirim Order — {cart.length} produk ({cartQty} qty)
        </button>
      )
    ) : undefined

  return (
    <Shell title="Keranjang" showBack actionBar={cartActionBar}>
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
            {cart.map((item) => (
              <div key={item.product.id} className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-xl shrink-0">
                  {getCategoryIcon(item.product.productCategory) ? (
                    <CategoryIcon name={getCategoryIcon(item.product.productCategory)} size={20} />
                  ) : (
                    '-'
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold leading-tight">{item.product.itemName}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.product.salesUnit}</p>
                </div>
                <QtyControl
                  product={item.product}
                  qty={item.qty ?? 0}
                  onIncrease={() => increase(item.product)}
                  onDecrease={() => decrease(item.product)}
                  onRemove={() => decrease(item.product)}
                />
              </div>
            ))}
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
          </div>
        </div>
      )}
    </Shell>
  )
}

export default CartPage
