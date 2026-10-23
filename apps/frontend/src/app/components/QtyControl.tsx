import { Product } from '@repo/shared'
import React from 'react'
import { Minus, Plus, Trash2, MessageCircle, X, ShoppingBag, AlertTriangle } from 'lucide-react'
import { useAuth } from '../contexts/authHook'
import { useCart } from '../contexts'
import { useContactSales } from '../contexts/ContactSalesContext'
import { formatRupiah } from '@/lib/formatCurrency'

type QtyControlProps = {
  product: Product
  onContactSales?: (product: Product) => void
  qty?: number
  onQtyChange?: (productId: number, qty: number) => void
  onIncrease?: (product: Product) => void
  onDecrease?: (product: Product) => void
  onRemove?: (productId: number) => void
  onAdd?: (product: Product) => void
  disabled?: boolean
}

const QtyControlComponent = ({
  product,
  onContactSales,
  qty: propsQty,
  onQtyChange: propsOnQtyChange,
  onIncrease: propsOnIncrease,
  onDecrease: propsOnDecrease,
  onRemove: propsOnRemove,
  onAdd: propsOnAdd,
  disabled,
}: QtyControlProps) => {
  const { isCustomer, user: currentUser } = useAuth()
  const customer = currentUser?.customer
  const creditLimit = Number(customer?.creditLimit ?? 0)
  const balance = Number(customer?.balance ?? 0)
  const remainingCredit = creditLimit - balance
  const isOverCredit = creditLimit > 0 && remainingCredit < 0
  const [showCreditModal, setShowCreditModal] = React.useState(false)

  const { open: openContactSales } = useContactSales()
  const {
    onQtyChange: ctxOnQtyChange,
    increase: ctxIncrease,
    decrease: ctxDecrease,
    getQty: ctxGetQty,
    remove: ctxRemove,
  } = useCart()

  const qty = propsQty ?? ctxGetQty(product.id)
  const onQtyChange = propsOnQtyChange ?? ((id: number, q: number) => ctxOnQtyChange(product, q))
  const onIncrease = propsOnIncrease ?? ctxIncrease
  const onDecrease = propsOnDecrease ?? ctxDecrease
  const onRemove = propsOnRemove ?? ctxRemove
  const onAdd = propsOnAdd ?? ctxIncrease

  const [localIsEditing, setLocalIsEditing] = React.useState(false)
  const editing = propsQty != null ? false : localIsEditing

  const [inputValue, setInputValue] = React.useState(String(qty))

  const [showPriceConfirm, setShowPriceConfirm] = React.useState(false)

  const isActualPrice = product.priceSource === 'actual'
  const hasPrice = product.price != null

  React.useEffect(() => {
    if (!editing) {
      setInputValue(String(qty))
    }
  }, [qty, editing])

  
  const creditModal = showCreditModal ? (
    <div
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setShowCreditModal(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`credit-warning-${product.id}`}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle size={24} className="text-destructive" />
        </div>
        <h3 id={`credit-warning-${product.id}`} className="text-base font-bold text-foreground">
          Transaksi Tidak Dapat Dilanjutkan
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Limit kredit Anda telah terlampaui. Silakan hubungi sales untuk informasi lebih lanjut.
        </p>
        <div className="rounded-xl bg-secondary/50 p-4 m-2 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Limit Kredit</span>
            <span className="font-semibold">{formatRupiah(creditLimit)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Tagihan</span>
            <span className="font-semibold">{formatRupiah(balance)}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-sm font-medium">Sisa Kredit</span>
            <span className="font-bold text-lg text-destructive">
              {formatRupiah(remainingCredit)}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreditModal(false)}
          className="mt-5 w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground"
        >
          Mengerti
        </button>
      </div>
    </div>
  ) : null

  const handleAdd = () => {
    if (isOverCredit) {
      setShowCreditModal(true)
      return
    }
    if (isActualPrice && hasPrice) {
      onAdd(product)
      return
    }
    setShowPriceConfirm(true)
  }

  const handleAcceptPrice = () => {
    if (isOverCredit) {
      setShowPriceConfirm(false)
      setShowCreditModal(true)
      return
    }
    if (!hasPrice) {
      return
    }
    onAdd(product)
    setShowPriceConfirm(false)
  }

  const handleContactSales = () => {
    setShowPriceConfirm(false)
    ;(onContactSales ?? openContactSales)(product)
  }

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    if (value === '') {
      return
    }
    const newQty = Number(value)
    if (!Number.isNaN(newQty) && newQty >= 0) {
      onQtyChange(product.id, newQty)
    }
  }

  const handleBlur = () => {
    if (isOverCredit) {
      setLocalIsEditing(false)
      setInputValue(String(qty))
      return
    }
    setLocalIsEditing(false)
    const newQty = Number(inputValue)
    if (inputValue === '' || Number.isNaN(newQty) || newQty <= 0) {
      onRemove(product.id)
      return
    }
    onQtyChange(product.id, newQty)
  }

  const baseButton =
    'cursor-pointer w-7 h-7 flex items-center justify-center rounded-full active:scale-95 transition-transform hover:bg-secondary'
  const plusButton =
    'cursor-pointer w-7 h-7 flex items-center justify-center rounded-full active:scale-95 transition-transform bg-accent text-accent-foreground hover:bg-accent/80'

  if (qty === 0 && !editing && !disabled) {
    return (
      <>
        {creditModal}
        <button
          type="button"
          onClick={handleAdd}
          className="flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
          title={isActualPrice ? 'Tambah ke keranjang' : 'Lihat opsi harga'}
        >
          <ShoppingBag size={16} />
        </button>
        {showPriceConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowPriceConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`price-confirm-${product.id}`}
              className="relative w-full max-w-sm rounded-2xl border border-border bg-background shadow-xl p-5"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowPriceConfirm(false)}
                className="absolute right-3 top-3 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X size={16} />
              </button>
              <div className="pr-8">
                <h3 id={`price-confirm-${product.id}`} className="font-semibold text-base">
                  {hasPrice ? 'Konfirmasi Harga' : 'Hubungi Sales'}
                </h3>
                <p className="mt-1 text-sm font-medium">{product.itemName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {product.itemCode}
                  {product.salesUnit ? ` · ${product.salesUnit}` : ''}
                </p>
              </div>
              {hasPrice ? (
                <>
                  <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                    <div className="text-xs text-muted-foreground">Harga saat ini</div>
                    <div className="mt-1 text-lg font-bold">{formatRupiah(product.price)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Harga berdasarkan price list
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-muted-foreground">
                    Produk ini belum memiliki harga transaksi aktual Anda. Anda dapat menggunakan
                    harga price list di atas atau menghubungi sales.
                  </p>
                  <button
                    type="button"
                    onClick={handleAcceptPrice}
                    className="mt-4 w-full rounded-xl bg-accent text-accent-foreground font-semibold py-2.5 active:scale-[0.99] transition-transform"
                  >
                    Setuju & Tambah ke Keranjang
                  </button>
                </>
              ) : (
                <div className="mt-4 rounded-xl bg-secondary/50 p-4">
                  <p className="text-sm text-muted-foreground">
                    Harga untuk produk ini belum tersedia. Hubungi sales untuk mendapatkan informasi
                    harga.
                  </p>
                </div>
              )}
              <button
                type="button"
                onClick={handleContactSales}
                className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
              >
                <MessageCircle size={16} />
                Hubungi Sales
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <>
      {creditModal}
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Kurangi jumlah"
          disabled={disabled}
          onClick={() => {
            if (isOverCredit) {
              setShowCreditModal(true)
              return
            }
            onDecrease(product)
          }}
          className={`${baseButton} bg-secondary ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Minus size={13} />
        </button>
        <input
          type="number"
          min={0}
          value={inputValue}
          aria-label={`Jumlah ${product.itemName}`}
          onFocus={() => setLocalIsEditing(true)}
          onChange={handleQtyChange}
          onBlur={handleBlur}
          disabled={disabled}
          className="w-12 h-8 rounded-lg border border-border bg-background text-sm font-semibold text-center tabular-nums text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 hover:border-primary/50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button
          type="button"
          aria-label="Tambah jumlah"
          disabled={disabled}
          onClick={() => {
            if (isOverCredit) {
              setShowCreditModal(true)
              return
            }
            onIncrease(product)
          }}
          className={`${plusButton} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <Plus size={13} />
        </button>
        <button
          type="button"
          aria-label="Hapus dari keranjang"
          disabled={disabled}
          onClick={() => onRemove(product.id)}
          className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/5 active:scale-95 transition-transform ${disabled ? 'opacity-50 pointer-events-none' : ''}"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
