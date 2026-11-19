import { Minus, Plus, X } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import { QuantityDialogProps } from '../types'

const QuantityDialog = (props: QuantityDialogProps) => {
  const {
    showQtyDialog,
    closeDialog,
    product,
    handleConfirmQty,
    validConvertedQty,
    disabled,
    sapChecking,
    stockChecked,
    priceChecked,
    sapPrice,
    qty,
    dialogUnitRef,
    selectedUnit,
    salesUnit,
    handleDialogUnitChange,
    canConvert,
    purchaseUnit,
    handleDialogQtyChange,
    dialogQty,
    purchasePackSize,
    decreaseDialogQty,
    increaseDialogQty,
    dialogQuantity,
    convertedQty,
    sapCheckError,
  } = props
  if (!showQtyDialog) return null

  const cannotConfirm =
    !validConvertedQty ||
    disabled ||
    sapChecking ||
    !stockChecked ||
    !priceChecked ||
    sapPrice === null

  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/50 p-4"
      onClick={closeDialog}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`add-cart-${product.id}`}
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          event.stopPropagation()
          handleConfirmQty()
        }}
      >
        <div className="flex items-center justify-between gap-3">
          <h3 id={`add-cart-${product.id}`} className="font-bold text-foreground">
            Tambah ke Keranjang
          </h3>

          <button type="button" aria-label="Tutup" onClick={closeDialog}>
            <X size={18} />
          </button>
        </div>

        <p className="mt-4 text-sm font-semibold text-foreground">{product.itemName}</p>

        <p className="mt-1 text-sm text-muted-foreground">
          {sapChecking
            ? 'Memeriksa harga ...'
            : sapPrice !== null
              ? formatRupiah(sapPrice)
              : 'Harga SAP belum tersedia'}

          {product.salesUnit ? ` / ${product.salesUnit}` : ''}
        </p>

        {qty > 0 && <p className="mt-2 text-xs text-muted-foreground">Sudah di keranjang: {qty}</p>}

        <div className="mt-5 grid grid-cols-[1fr_1fr] gap-3">
          <div>
            <label htmlFor={`unit-dialog-${product.id}`} className="block text-sm font-medium">
              Satuan
            </label>

            <select
              ref={dialogUnitRef}
              id={`unit-dialog-${product.id}`}
              value={selectedUnit}
              onChange={(event) => handleDialogUnitChange(event.target.value)}
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
                onClick={decreaseDialogQty}
              >
                <Minus size={16} />
              </button>

              <input
                id={`qty-dialog-${product.id}`}
                type="text"
                inputMode="numeric"
                value={dialogQty}
                onChange={(event) => handleDialogQtyChange(event.target.value)}
                className="h-9 w-full min-w-0 rounded-lg border border-border bg-background px-2 text-center text-sm font-semibold"
              />

              <button
                type="button"
                aria-label="Tambah jumlah"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border"
                onClick={increaseDialogQty}
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
              {dialogQuantity} {purchaseUnit}
              {' = '}
              {convertedQty} {salesUnit}
            </span>
          </div>
        )}

        <div className="mt-3 text-xs text-muted-foreground" role="status">
          {sapChecking
            ? 'Memeriksa harga dan stok SAP...'
            : sapCheckError ||
              (stockChecked
                ? priceChecked
                  ? 'Harga dan stok telah diverifikasi.'
                  : 'Stok telah diperiksa. Harga SAP belum diverifikasi.'
                : 'Stok belum berhasil diperiksa.')}
        </div>

        <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">Subtotal</span>

          <span className="font-bold">
            {formatRupiah(validConvertedQty && sapPrice !== null ? convertedQty * sapPrice : 0)}
          </span>
        </div>

        <button
          type="button"
          disabled={cannotConfirm}
          onClick={handleConfirmQty}
          className="mt-5 w-full rounded-xl bg-accent py-3 font-semibold text-accent-foreground disabled:opacity-50"
        >
          Tambah ke Keranjang
        </button>
      </div>
    </div>
  )
}

export default QuantityDialog
