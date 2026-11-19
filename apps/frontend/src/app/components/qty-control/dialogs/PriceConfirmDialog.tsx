import { MessageCircle, X } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import { PriceConfirmDialogProps } from '../types'

const PriceConfirmDialog = (props: PriceConfirmDialogProps) => {
  const {
    showPriceConfirm,
    closeDialog,
    product,
    hasPrice,
    handleAcceptPrice,
    handleContactSales,
  } = props
  if (!showPriceConfirm) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={closeDialog}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`price-confirm-${product.id}`}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-background p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Tutup"
          onClick={closeDialog}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X size={16} />
        </button>

        <div className="pr-8">
          <h3 id={`price-confirm-${product.id}`} className="text-base font-semibold">
            {hasPrice ? 'Konfirmasi Harga' : 'Hubungi Sales'}
          </h3>

          <p className="mt-1 text-sm font-medium">{product.itemName}</p>

          <p className="mt-0.5 text-xs text-muted-foreground">
            {product.itemCode}
            {product.salesUnit ? ` · ${product.salesUnit}` : ''}
          </p>

          {product.priceIncreased &&
            product.priceIncreasePercent != null &&
            product.priceIncreasePercent > 0 && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                Harga naik {product.priceIncreasePercent.toFixed(2)}%
              </p>
            )}
        </div>

        {hasPrice ? (
          <>
            <div className="mt-4 rounded-xl bg-secondary/50 p-4">
              <div className="text-xs text-muted-foreground">Harga saat ini</div>

              <div className="mt-1 text-lg font-bold">{formatRupiah(product.price)}</div>

              <div className="mt-1 text-xs text-muted-foreground">Harga berdasarkan price list</div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Produk ini belum memiliki harga transaksi aktual Anda. Anda dapat menggunakan harga
              price list di atas atau menghubungi sales.
            </p>

            <button
              type="button"
              onClick={handleAcceptPrice}
              className="mt-4 w-full rounded-xl bg-accent py-2.5 font-semibold text-accent-foreground transition-transform active:scale-[0.99]"
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
          className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-semibold transition-colors hover:bg-secondary"
        >
          <MessageCircle size={16} />
          Hubungi Sales
        </button>
      </div>
    </div>
  )
}

export default PriceConfirmDialog
