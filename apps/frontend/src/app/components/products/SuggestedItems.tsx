import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, X } from 'lucide-react'
import { useAuth, useCategories, useOrders } from '@contexts'
import { useLoadMore } from '@components'

export default function SuggestedItems() {
  const { isCustomer } = useAuth()
  const { suggestedProducts, loading } = useCategories()
  const { sendQuote, submitting } = useOrders()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const { visibleItems, hasMore, loadMore } = useLoadMore({
    items: suggestedProducts,
    pageSize: 45,
  })

  const [quoteOpen, setQuoteOpen] = useState(false)

  if (!isCustomer) return null

  const items = suggestedProducts
    .filter((product) => selected[String(product.id)])
    .map((product) => ({ product }))

  const submit = async () => {
    setError('')
    setSent(false)
    try {
      await sendQuote(items, notes)
      setSelected({})
      setNotes('')
      setSent(true)
    } catch (e: any) {
      setError(e.message)
    }
  }
  return (
    <section className="space-y-3 pt-6">
      <div>
        <h2 className="font-bold text-foreground">Produk Disarankan</h2>
        <p className="text-sm text-muted-foreground">Produk yang dibeli pelanggan lain.</p>
        <p className="text-sm text-muted-foreground">
          Masukkan produk yang ingin Anda beli ke dalam permintaan penawaran, lalu tim sales akan
          menghubungi Anda.
        </p>
      </div>
      {sent && (
        <p role="status" className="rounded-xl bg-green-50 p-3 text-sm text-green-700">
          Permintaan penawaran terkirim. Tim sales akan menghubungi Anda.{' '}
          <Link to="/orders" className="underline">
            Lihat permintaan
          </Link>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {loading ? (
        <p>Memuat saran...</p>
      ) : !suggestedProducts.length ? (
        <p className="text-sm text-muted-foreground">Belum ada produk saran yang tersedia.</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((product) => (
              <div
                key={product.id}
                className="rounded-xl border border-border bg-white p-4 space-y-3"
              >
                <div>
                  <p className="font-semibold text-sm">{product.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.itemCode} · {product.salesUnit}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(selected[String(product.id)])}
                    disabled={submitting}
                    onChange={(e) =>
                      setSelected((previous) => ({
                        ...previous,
                        [String(product.id)]: e.target.checked,
                      }))
                    }
                  />
                  Tambahkan ke penawaran
                </label>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex items-center gap-4">
              <hr className="flex-1 border-border" />

              <button
                type="button"
                onClick={loadMore}
                className="shrink-0 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold text-foreground hover:border-accent/40 transition-colors inline-flex items-center justify-center gap-2"
              >
                Lebih banyak
                <ChevronDown size={16} />
              </button>

              <hr className="flex-1 border-border" />
            </div>
          )}
        </>
      )}
      {items.length > 0 && (
        <>
          {/* Mini Bar */}
          {!quoteOpen && (
            <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4">
              <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 rounded-2xl border border-border bg-white p-3 shadow-xl">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {items.length} produk dipilih
                  </p>

                  <p className="truncate text-xs text-muted-foreground">
                    Lanjutkan untuk membuat permintaan penawaran
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setQuoteOpen(true)}
                  className="shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Minta Penawaran
                </button>
              </div>
            </div>
          )}

          {/* Bottom Sheet */}
          {quoteOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
                onClick={() => !submitting && setQuoteOpen(false)}
              />

              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="quote-title"
                className="
            fixed
            inset-x-0
            bottom-0
            z-50
            mx-auto
            w-full
            max-w-2xl
            rounded-t-3xl
            border
            border-border
            bg-white
            shadow-2xl
            animate-in
            slide-in-from-bottom
            duration-300
          "
              >
                {/* Handle */}
                <div className="flex justify-center pt-3">
                  <div className="h-1 w-10 rounded-full bg-border" />
                </div>

                <div className="p-5 pt-3 sm:p-6">
                  {/* Header */}
                  <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                      <h3 id="quote-title" className="text-base font-bold text-foreground">
                        Permintaan Penawaran
                      </h3>

                      <p className="mt-1 text-sm text-muted-foreground">
                        {items.length} produk dipilih
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setQuoteOpen(false)}
                      disabled={submitting}
                      className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-secondary
                  text-muted-foreground
                  transition-colors
                  hover:text-foreground
                  disabled:opacity-50
                "
                      aria-label="Tutup"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Notes */}
                  <label className="block">
                    <span className="text-sm font-semibold text-foreground">Catatan</span>

                    <span className="ml-1 text-xs text-muted-foreground">(opsional)</span>

                    <textarea
                      value={notes}
                      maxLength={5000}
                      rows={4}
                      disabled={submitting}
                      onChange={(e) => setNotes(e.target.value)}
                      className="
                  mt-2
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-border
                  bg-white
                  p-3
                  text-sm
                  text-foreground
                  outline-none
                  transition-colors
                  placeholder:text-muted-foreground
                  focus:border-accent
                  focus:ring-2
                  focus:ring-accent/10
                  disabled:opacity-50
                "
                      placeholder="Jumlah kebutuhan, pembelian rutin, atau pertanyaan harga..."
                    />
                  </label>

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={submit}
                    disabled={submitting}
                    className="
                mt-4
                flex
                w-full
                items-center
                justify-center
                rounded-xl
                bg-primary
                px-4
                py-3
                text-sm
                font-bold
                text-white
                transition-opacity
                hover:opacity-90
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
                  >
                    {submitting
                      ? 'Mengirim...'
                      : `Kirim Permintaan Penawaran (${items.length} produk)`}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
