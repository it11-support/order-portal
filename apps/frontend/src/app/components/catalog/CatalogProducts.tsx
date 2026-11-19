import {
  ChevronDown,
  MessageSquareText,
  PackageSearch,
  ShoppingBag,
  ShoppingCart,
  X,
} from 'lucide-react'

import { Loader, ProductList } from '@components'
import { formatRupiah } from '@/lib/formatCurrency'
import { CatalogProductsProps } from './types'

const CatalogProducts = ({
  isCustomer,
  isNonCustomer,
  catalogMode,
  setCatalogMode,
  products,
  loading,
  fetching,
  reachingEnd,
  total,
  loadMore,
  inquiryItems,
  onToggleInquiry,
  cart,
  catalogRef,
}: CatalogProductsProps) => {
  return (
    <section ref={catalogRef} id="catalog-products" className="space-y-5 scroll-mt-6">
      {isCustomer && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCatalogMode('history')}
            aria-pressed={catalogMode === 'history'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${
              catalogMode === 'history'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-foreground'
            }`}
          >
            <ShoppingBag size={16} />
            Riwayat Pembelian
          </button>

          <button
            type="button"
            onClick={() => setCatalogMode('inquiry')}
            aria-pressed={catalogMode === 'inquiry'}
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${
              catalogMode === 'inquiry'
                ? 'border-primary bg-primary text-white'
                : 'border-border bg-white text-foreground'
            }`}
          >
            <ShoppingCart size={16} />
            Inquiry Produk
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          {catalogMode === 'inquiry' && isCustomer ? (
            <MessageSquareText size={19} className="text-primary mt-0.5" />
          ) : (
            <ShoppingBag size={19} className="text-primary mt-0.5" />
          )}

          <div>
            <h2 className="text-sm font-bold">
              {isNonCustomer
                ? 'Produk'
                : catalogMode === 'history'
                  ? 'Riwayat Pembelian'
                  : 'Inquiry Produk'}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {isNonCustomer
                ? 'Semua produk sesuai kategori atau pencarian'
                : catalogMode === 'history'
                  ? 'Harga berdasarkan transaksi customer'
                  : 'Pilih produk yang belum pernah dibeli untuk mengirim inquiry'}
            </p>
          </div>
        </div>

        {!loading && total > 0 && (
          <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {total} produk
          </span>
        )}
      </div>

      {loading ? (
        <Loader label="Memuat produk..." className="py-8" />
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
          <PackageSearch size={24} className="mx-auto mb-3 text-muted-foreground" />

          <h3 className="text-sm font-semibold">
            {isCustomer && catalogMode === 'history'
              ? 'Belum ada riwayat pembelian'
              : 'Tidak ada produk'}
          </h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Tidak ada produk tersedia pada kategori ini.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {isCustomer && catalogMode === 'inquiry' ? (
            <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
              {products.map((product) => {
                const selected = inquiryItems.some((item) => item.productId === String(product.id))

                return (
                  <div key={product.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{product.itemName}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold text-muted-foreground">
                          {formatRupiah(product.price)}
                          {product.salesUnit ? ` / ${product.salesUnit}` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onToggleInquiry(product)}
                      aria-label={
                        selected
                          ? `Batalkan inquiry ${product.itemName}`
                          : `Tambahkan inquiry ${product.itemName}`
                      }
                      aria-pressed={selected}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${
                        selected
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-white text-primary'
                      }`}
                    >
                      {selected ? <X size={18} /> : <ShoppingCart size={18} />}
                    </button>
                  </div>
                )
              })}
            </div>
          ) : (
            <ProductList products={products} cart={cart} />
          )}

          {!reachingEnd && (
            <div className="flex items-center gap-4">
              <hr className="flex-1 border-border" />

              <button
                type="button"
                onClick={loadMore}
                disabled={fetching}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold disabled:opacity-50"
              >
                {fetching ? 'Memuat...' : 'Lebih banyak'}
                <ChevronDown size={16} />
              </button>

              <hr className="flex-1 border-border" />
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default CatalogProducts
