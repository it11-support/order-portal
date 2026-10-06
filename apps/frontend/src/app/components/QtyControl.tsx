import { Product } from '@repo/shared'
import {
  Minus,
  Plus,
  Trash2,
  MessageCircle,
  X,
  LucideShoppingCart,
  ShoppingBag,
} from 'lucide-react'
import React from 'react'
import { useAuth } from '../contexts/authHook'
import { useCart } from '../contexts'
import { useContactSales } from '../contexts/ContactSalesContext'

type QtyControlProps = {
  product: Product
  onContactSales?: (product: Product) => void
}

const QtyControlComponent = ({ product, onContactSales }: QtyControlProps) => {
  const { isCustomer } = useAuth()
  const { open: openContactSales } = useContactSales()

  const {
    onQtyChange,
    increase: onIncrease,
    decrease: onDecrease,
    getQty,
    remove: onRemove,
  } = useCart()

  const qty = getQty(product.id)

  const [inputValue, setInputValue] = React.useState(String(qty))

  const [isEditing, setIsEditing] = React.useState(false)

  const [showPriceConfirm, setShowPriceConfirm] = React.useState(false)

  const isActualPrice = product.priceSource === 'actual'

  const hasPrice = product.price != null

  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(String(qty))
    }
  }, [qty, isEditing])

  if (!isCustomer) {
    return null
  }

  // ============================================================
  // ADD PRODUCT
  // ============================================================

  const handleAdd = () => {
    // Harga transaksi aktual customer:
    // langsung boleh masuk keranjang.
    if (isActualPrice && hasPrice) {
      onIncrease(product)
      return
    }

    // Price list atau belum ada harga:
    // customer harus melihat pilihan terlebih dahulu.
    setShowPriceConfirm(true)
  }

  // ============================================================
  // ACCEPT PRICE LIST
  // ============================================================

  const handleAcceptPrice = () => {
    if (!hasPrice) {
      return
    }

    onIncrease(product)
    setShowPriceConfirm(false)
  }

  // ============================================================
  // CONTACT SALES
  // ============================================================

  const handleContactSales = () => {
    setShowPriceConfirm(false)
    ;(onContactSales ?? openContactSales)(product)
  }

  // ============================================================
  // QTY CHANGE
  // ============================================================

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    setInputValue(value)

    // Izinkan kosong sementara ketika sedang mengetik.
    if (value === '') {
      return
    }

    const newQty = Number(value)

    if (!Number.isNaN(newQty) && newQty >= 0) {
      onQtyChange(product, newQty)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)

    const newQty = Number(inputValue)

    if (inputValue === '' || Number.isNaN(newQty) || newQty <= 0) {
      onRemove(product.id)
      return
    }

    onQtyChange(product, newQty)
  }

  // ============================================================
  // INITIAL ADD BUTTON
  // ============================================================

  if (qty === 0 && !isEditing) {
    return (
      <>
        <button
          type="button"
          onClick={handleAdd}
          className="
            cursor-pointer
            flex items-center gap-1
            bg-accent
            text-accent-foreground
            text-xs font-bold
            px-3 py-1.5
            rounded-lg
            active:scale-95
            transition-transform
          "
          title={isActualPrice ? 'Tambah ke keranjang' : 'Lihat opsi harga'}
        >
          <ShoppingBag size={16} />
        </button>

        {showPriceConfirm && (
          <div
            className="
              fixed inset-0 z-50
              flex items-center justify-center
              bg-black/40
              p-4
            "
            onClick={() => setShowPriceConfirm(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={`price-confirm-${product.id}`}
              className="
                relative
                w-full max-w-sm
                rounded-2xl
                bg-background
                border border-border
                shadow-xl
                p-5
              "
              onClick={(e) => e.stopPropagation()}
            >
              {/* CLOSE */}
              <button
                type="button"
                aria-label="Tutup"
                onClick={() => setShowPriceConfirm(false)}
                className="
                  absolute
                  right-3 top-3
                  w-8 h-8
                  flex items-center justify-center
                  rounded-full
                  text-muted-foreground
                  hover:bg-secondary
                  hover:text-foreground
                "
              >
                <X size={16} />
              </button>

              {/* HEADER */}
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

              {/* PRICE AVAILABLE */}
              {hasPrice ? (
                <>
                  <div
                    className="
                      mt-4
                      rounded-xl
                      bg-secondary/50
                      p-4
                    "
                  >
                    <div className="text-xs text-muted-foreground">Harga saat ini</div>

                    <div className="mt-1 text-lg font-bold">
                      {product.currency === 'IDR'
                        ? 'Rp '
                        : product.currency
                          ? `${product.currency} `
                          : ''}

                      {Number(product.price).toLocaleString('id-ID')}
                    </div>

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
                    className="
                      mt-4
                      w-full
                      rounded-xl
                      bg-accent
                      text-accent-foreground
                      font-semibold
                      py-2.5
                      active:scale-[0.99]
                      transition-transform
                    "
                  >
                    Setuju & Tambah ke Keranjang
                  </button>
                </>
              ) : (
                /* NO PRICE */
                <div
                  className="
                    mt-4
                    rounded-xl
                    bg-secondary/50
                    p-4
                  "
                >
                  <p className="text-sm text-muted-foreground">
                    Harga untuk produk ini belum tersedia. Hubungi sales untuk mendapatkan informasi
                    harga.
                  </p>
                </div>
              )}

              {/* CONTACT SALES — always open: a price list figure is not a price
                  this customer pays, and asking for a real one is the only way
                  to get one. */}
              <button
                type="button"
                onClick={handleContactSales}
                className="
                  mt-2
                  w-full
                  flex items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border border-border
                  py-2.5
                  text-sm
                  font-semibold
                  transition-colors
                  hover:bg-secondary
                "
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

  // ============================================================
  // PRODUCT ALREADY IN CART
  // ============================================================

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-label="Kurangi jumlah"
        onClick={() => onDecrease(product)}
        className="
          cursor-pointer
          w-7 h-7
          flex items-center justify-center
          bg-secondary
          rounded-full
          active:scale-95
          transition-transform
          hover:bg-border
        "
      >
        <Minus size={13} />
      </button>

      <input
        type="number"
        min={0}
        value={inputValue}
        aria-label={`Jumlah ${product.itemName}`}
        onFocus={() => setIsEditing(true)}
        onChange={handleQtyChange}
        onBlur={handleBlur}
        className="
          w-12 h-8
          rounded-lg
          border border-border
          bg-background
          text-sm font-semibold
          text-center tabular-nums
          text-foreground
          outline-none
          transition-all
          focus:border-primary
          focus:ring-2
          focus:ring-primary/20
          hover:border-primary/50
          [appearance:textfield]
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />

      <button
        type="button"
        aria-label="Tambah jumlah"
        onClick={() => onIncrease(product)}
        className="
          cursor-pointer
          w-7 h-7
          flex items-center justify-center
          bg-accent
          text-accent-foreground
          rounded-full
          active:scale-95
          transition-transform
          hover:bg-accent/80
        "
      >
        <Plus size={13} />
      </button>

      <button
        type="button"
        aria-label="Hapus dari keranjang"
        onClick={() => onRemove(product.id)}
        className="
          cursor-pointer
          w-7 h-7
          flex items-center justify-center
          rounded-full
          border border-destructive/30
          text-destructive
          hover:bg-destructive/5
        "
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
