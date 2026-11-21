import { useState } from 'react'
import { ChevronDown, ClipboardList, Minus, Plus, Save, Send, Trash2 } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import type { Cart } from './types'
import { useCart } from '@contexts'

type Props = {
  cart: Cart
  isSavedDraft: boolean
  onCancel: () => void
  onSave: () => void | Promise<void>
  onSubmit: () => void | Promise<void>
  disabled?: boolean
}

const ActiveDraftSummary = ({
  cart,
  onCancel,
  disabled = false,
  isSavedDraft,
  onSave,
  onSubmit,
}: Props) => {
  const [expanded, setExpanded] = useState(false)
  const { remove, setQty } = useCart()

  const totalQty = cart.reduce((sum, item) => sum + (item.qty ?? 0), 0)

  const getPrice = (item: Cart[number]) =>
    item.acceptedPrice ?? item.price ?? item.product.price ?? 0

  const total = cart.reduce((sum, item) => sum + Number(getPrice(item)) * (item.qty ?? 0), 0)

  const removeCartItem = (productId: string) => {
    remove(Number(productId))
  }

  const setCartItemQty = (productId: string, qty: number) => {
    const item = cart.find((line) => String(line.product.id) === productId)

    if (!item) return

    setQty(item.product, qty)
  }

  return (
    <section className="min-w-0">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        aria-controls="active-draft-summary-content"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800">
            <ClipboardList size={18} />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">
                {isSavedDraft ? 'Draft Aktif' : 'Order Baru'}
              </h3>{' '}
            </div>
            <p className="text-xs text-muted-foreground">
              {cart.length} produk · {totalQty} unit
            </p>
          </div>
        </div>

        <span className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-bold tabular-nums">{formatRupiah(total)}</span>
          <ChevronDown
            size={16}
            className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {expanded && (
        <div id="active-draft-summary-content" className="border-t border-border">
          <div className="max-h-80 divide-y divide-border overflow-y-auto">
            {cart.map((item, index) => {
              const price = Number(getPrice(item))
              const qty = item.qty ?? 0
              const productId = String(item.product.id)

              return (
                <div key={productId} className="px-4 py-3">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-slate-400">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold leading-snug text-slate-900">
                        {item.product.itemName}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-500">
                        {formatRupiah(price)} / unit
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCartItem(productId)}
                      disabled={disabled}
                      aria-label={`Hapus ${item.product.itemName}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between pl-8">
                    <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                      <button
                        type="button"
                        onClick={() => setCartItemQty(productId, qty - 1)}
                        disabled={disabled}
                        aria-label={`Kurangi ${item.product.itemName}`}
                        className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="flex h-8 min-w-9 items-center justify-center border-x border-slate-300 px-2 text-xs font-bold tabular-nums text-slate-900">
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => setCartItemQty(productId, qty + 1)}
                        disabled={disabled}
                        aria-label={`Tambah ${item.product.itemName}`}
                        className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {formatRupiah(price * qty)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-3 border-t border-border bg-slate-50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold tabular-nums">{formatRupiah(total)}</span>
            </div>
          </div>
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-border pt-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          title={isSavedDraft ? 'Hapus Draft' : 'Kosongkan'}
          aria-label={isSavedDraft ? 'Hapus Draft' : 'Kosongkan'}
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-red-200 px-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <Trash2 size={15} className="shrink-0" />
          <span className="hidden sm:inline">{isSavedDraft ? 'Hapus Draft' : 'Kosongkan'}</span>
        </button>

        <button
          type="button"
          onClick={() => void onSave()}
          disabled={disabled || cart.length === 0}
          title="Simpan Draft"
          aria-label="Simpan Draft"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-accent px-2 text-xs font-semibold text-accent hover:bg-accent/5 disabled:opacity-50"
        >
          <Save size={15} className="shrink-0" />
          <span className="hidden sm:inline">Simpan Draft</span>
        </button>

        <button
          type="button"
          onClick={() => void onSubmit()}
          disabled={disabled || cart.length === 0}
          title="Kirim Order"
          aria-label="Kirim Order"
          className="inline-flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-lg bg-accent px-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          <Send size={15} className="shrink-0" />
          <span className="hidden sm:inline">Kirim Order</span>
        </button>
      </div>
    </section>
  )
}

export default ActiveDraftSummary
