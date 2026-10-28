import { Product } from '@repo/shared'
import React, { useEffect, useState } from 'react'
import { Minus, Plus, Trash2, MessageCircle, X, AlertTriangle, ShoppingCart } from 'lucide-react'
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
  listMode?: boolean
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
  listMode = false,
  disabled,
}: QtyControlProps) => {
  const { user: currentUser, isCustomer } = useAuth()
  const customer = currentUser?.customer
  const creditLimit = Number(customer?.creditLimit ?? 0)
  const balance = Number(customer?.balance ?? 0)
  const remainingCredit = creditLimit - balance
  const isOverCredit = creditLimit > 0 && remainingCredit < 0
  const [showCreditModal, setShowCreditModal] = React.useState(false)
  const [selectedUnit, setSelectedUnit] = React.useState<string>('salesUnit')

  const { open: openContactSales } = useContactSales()
  const {
    onQtyChange: ctxOnQtyChange,
    increase: ctxIncrease,
    decrease: ctxDecrease,
    getQty: ctxGetQty,
    remove: ctxRemove,
  } = useCart()

  const salesUnit = product.salesUnit || 'PCS'
  const purchaseUnit = product.purchaseUnit
  const purchasePackSize = Number(product.purchasePackSize ?? 1)
  const qty = propsQty ?? ctxGetQty(product.id)
  const onQtyChange = propsOnQtyChange ?? ((id: number, q: number) => ctxOnQtyChange(product, q))
  const onIncrease = propsOnIncrease ?? ctxIncrease
  const onDecrease = propsOnDecrease ?? ctxDecrease
  const onRemove = propsOnRemove ?? ctxRemove

  const [localIsEditing, setLocalIsEditing] = useState(false)
  const editing = propsQty != null ? false : localIsEditing

  const [inputValue, setInputValue] = useState(String(qty))

  const [showPriceConfirm, setShowPriceConfirm] = useState(false)
  const [showQtyDialog, setShowQtyDialog] = useState(false)
  const [dialogQty, setDialogQty] = useState('1')

  const isActualPrice = product.priceSource === 'actual'
  const hasPrice = product.price != null && Number(product.price) > 0

  useEffect(() => {
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
      setDialogQty('1')
      setSelectedUnit('salesUnit')
      setShowQtyDialog(true)
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
    setShowPriceConfirm(false)
    setDialogQty('1')
    setSelectedUnit('salesUnit')
    setShowQtyDialog(true)
  }

  const dialogQuantity = Number(dialogQty)
  const validDialogQty =
    /^\d+$/.test(dialogQty) && Number.isSafeInteger(dialogQuantity) && dialogQuantity > 0

  const handleConfirmQty = () => {
    if (!validConvertedQty || disabled) return

    if (isOverCredit) {
      setShowQtyDialog(false)
      setShowCreditModal(true)
      return
    }

    // Selalu simpan quantity dalam salesUnit
    onQtyChange(product.id, qty + convertedQty)

    setShowQtyDialog(false)
    setDialogQty('1')
    setSelectedUnit('salesUnit')
  }

  const canConvert =
    Boolean(purchaseUnit) &&
    purchaseUnit !== salesUnit &&
    Number.isFinite(purchasePackSize) &&
    purchasePackSize > 0

  const conversionFactor = selectedUnit === 'purchaseUnit' && canConvert ? purchasePackSize : 1

  const convertedQty = validDialogQty ? dialogQuantity * conversionFactor : 0

  const validConvertedQty = validDialogQty && Number.isSafeInteger(convertedQty) && convertedQty > 0

  const qtyDialog = showQtyDialog ? (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onClick={() => setShowQtyDialog(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`add-cart-${product.id}`}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={`add-cart-${product.id}`} className="font-bold text-foreground">
            Tambah ke Keranjang
          </h3>
          <button type="button" aria-label="Tutup" onClick={() => setShowQtyDialog(false)}>
            <X size={18} />
          </button>
        </div>
        <p className="mt-4 text-sm font-semibold text-foreground">{product.itemName}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatRupiah(Number(product.price ?? 0))}
          {product.salesUnit ? ` / ${product.salesUnit}` : ''}
        </p>
        {qty > 0 && <p className="mt-2 text-xs text-muted-foreground">Sudah di keranjang: {qty}</p>}
        <div className="mt-5 grid grid-cols-[1fr_1fr] gap-3">
          <div>
            <label htmlFor={`unit-dialog-${product.id}`} className="block text-sm font-medium">
              Satuan
            </label>

            <select
              id={`unit-dialog-${product.id}`}
              value={selectedUnit}
              onChange={(event) =>
                setSelectedUnit(event.target.value as 'salesUnit' | 'purchaseUnit')
              }
              className="mt-2 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm"
            >
              <option value="salesUnit">{salesUnit}</option>

              {canConvert && (
                <option value="purchaseUnit">
                  {purchaseUnit} ({purchasePackSize} {salesUnit})
                </option>
              )}
            </select>
          </div>
          <div>
            <label htmlFor={`qty-dialog-${product.id}`} className="block text-sm font-medium">
              Qty
            </label>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border"
                onClick={() =>
                  setDialogQty(String(Math.max(1, (validDialogQty ? dialogQuantity : 1) - 1)))
                }
              >
                <Minus size={16} />
              </button>

              <input
                id={`qty-dialog-${product.id}`}
                type="text"
                inputMode="numeric"
                value={dialogQty}
                onChange={(event) => {
                  if (/^\d*$/.test(event.target.value)) {
                    setDialogQty(event.target.value)
                  }
                }}
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold"
              />

              <button
                type="button"
                aria-label="Tambah jumlah"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border"
                onClick={() => setDialogQty(String((validDialogQty ? dialogQuantity : 0) + 1))}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>
        </div>

        {validConvertedQty && selectedUnit === 'purchaseUnit' && (
          <div className="mt-3 rounded-lg bg-secondary/50 p-3 text-sm">
            <span className="text-muted-foreground">Konversi:</span>

            <span className="ml-2 font-semibold">
              {dialogQuantity} {selectedUnit === 'purchaseUnit' ? purchaseUnit : salesUnit}
              {' = '}
              {convertedQty} {salesUnit}
            </span>
          </div>
        )}
        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-bold">
            {formatRupiah(validConvertedQty ? convertedQty * Number(product.price ?? 0) : 0)}
          </span>
        </div>
        <button
          type="button"
          disabled={!validConvertedQty || disabled}
          onClick={handleConfirmQty}
          className="mt-5 w-full rounded-xl bg-accent py-3 font-semibold text-accent-foreground disabled:opacity-50"
        >
          Tambah ke Keranjang
        </button>
      </div>
    </div>
  ) : null

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

  if (listMode || (qty === 0 && !editing && !disabled)) {
    return (
      <>
        {creditModal}
        {qtyDialog}
        {isCustomer && (
          <button
            type="button"
            onClick={handleAdd}
            disabled={disabled}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-primary hover:bg-secondary disabled:opacity-50"
            title={isActualPrice ? 'Tambah ke keranjang' : 'Lihat opsi harga'}
          >
            <ShoppingCart size={18} />
          </button>
        )}
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
