import { formatRupiah } from '@/lib/formatCurrency'
import type { Customer, Product } from '@repo/shared'
import {
  ArrowRight,
  Building2,
  ChevronDown,
  ClipboardList,
  Minus,
  Package2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { SalesProductRow } from './SalesProductRow'
import { QtyControl } from '../QtyControl'
import { Loader } from '../common'

type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>
type OrderLine = {
  product: Product
  qty: number
}
type ProductMeta = {
  current_page: number
  total_pages: number
  total_records: number
  limit: number
}
type ProductSuggestion = { product: Product; source: string }
type ProductTab = 'actual' | 'pricelist'

type ProductSelectionProps = {
  selectedCustomer: SelectedCustomer
  activeDraftId: string | null
  onBack: () => void
  onCancelDraft: (draftId: string) => void | Promise<void>
  posting: boolean
  lines: OrderLine[]
  onSaveDraft: () => void | Promise<void>
  totalQty: number
  total: number
  onRemoveLine: (productId: string) => void
  onSetLineQty: (productId: string, qty: number) => void
  onConfirm: () => void
  addLine: (product: Product, qty?: number) => void
  resetProductSearch: () => void
  productSearch: string
  onProductSearch: (value: string) => void
  productSuggestionsOpen: boolean
  setProductSuggestionsOpen: Dispatch<SetStateAction<boolean>>
  activeSuggestionIndex: number
  setActiveSuggestionIndex: Dispatch<SetStateAction<number>>
  suggestionsLoading: boolean
  productSuggestions: ProductSuggestion[]
  suggestionRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>
  openProductCart: (product: Product) => void
  searchingProducts: boolean
  historyError: unknown
  pricelistError: unknown
  cartDialogProduct: Product | null
  setCartDialogProduct: Dispatch<SetStateAction<Product | null>>
  cartOpenRequest: number
  productTab: ProductTab
  setProductTab: Dispatch<SetStateAction<ProductTab>>
  historyProducts: Product[]
  pricelistProducts: Product[]
  historyMeta?: ProductMeta
  pricelistMeta?: ProductMeta
  historyPage: number
  pricelistPage: number
  setHistoryPage: Dispatch<SetStateAction<number>>
  setPricelistPage: Dispatch<SetStateAction<number>>
  historyLoading: boolean
  pricelistLoading: boolean
}

const ProductSelection = (props: ProductSelectionProps) => {
  const [summaryExpanded, setSummaryExpanded] = useState(false)
  const productInputRef = useRef<HTMLInputElement>(null)
  const {
    selectedCustomer,
    activeDraftId,
    onBack,
    onCancelDraft,
    onSaveDraft,
    posting,
    lines,
    totalQty,
    total,
    onRemoveLine,
    onSetLineQty,
    onConfirm,
    addLine,
    resetProductSearch,
    productSearch,
    onProductSearch,
    productSuggestionsOpen,
    setProductSuggestionsOpen,
    activeSuggestionIndex,
    setActiveSuggestionIndex,
    suggestionsLoading,
    productSuggestions,
    suggestionRefs,
    openProductCart,
    searchingProducts,
    historyError,
    pricelistError,
    cartDialogProduct,
    setCartDialogProduct,
    cartOpenRequest,
    productTab,
    setProductTab,
    historyProducts,
    pricelistProducts,
    historyMeta,
    pricelistMeta,
    historyPage,
    pricelistPage,
    setHistoryPage,
    setPricelistPage,
    historyLoading,
    pricelistLoading,
  } = props

  useEffect(() => {
    const input = productInputRef.current

    if (!input || !selectedCustomer?.CardCode) return

    input.focus()
  }, [selectedCustomer?.CardCode])

  return (
    <div className="space-y-3">
      {/* Active account context */}
      <section className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Building2 size={14} /> Akun Customer
          </span>
          <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            AKUN DIPILIH
          </span>
        </div>
        <div className="flex items-start justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold leading-snug text-slate-900">
              {selectedCustomer.CardName}
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              <span className="font-mono">{selectedCustomer.CardCode}</span>
              {selectedCustomer.City ? ` · ${selectedCustomer.City}` : ''}
            </p>
            {selectedCustomer.CntctPrsn && (
              <p className="mt-0.5 text-xs text-slate-500">PIC: {selectedCustomer.CntctPrsn}</p>
            )}
          </div>
          {!activeDraftId && (
            <button
              type="button"
              onClick={() => onBack()}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ganti
            </button>
          )}
          {activeDraftId && (
            <button
              type="button"
              onClick={() => onCancelDraft(activeDraftId)}
              disabled={posting}
              className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 size={14} className="inline-block mr-1" />
              Hapus Draft
            </button>
          )}
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => void onSaveDraft()}
              disabled={posting}
              className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
            >
              Simpan draft
            </button>
          )}
        </div>
      </section>

      {/* Selected lines / order summary */}
      {lines.length > 0 && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setSummaryExpanded((expanded) => !expanded)}
            aria-expanded={summaryExpanded}
            aria-controls="order-summary-content"
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                <ClipboardList size={17} />
              </span>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Ringkasan Pesanan</h3>
                <p className="text-[11px] text-slate-500">
                  {lines.length} produk · {totalQty} unit
                </p>
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-sm font-bold tabular-nums text-slate-900">
                {formatRupiah(total)}
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
              />
            </span>
          </button>
          {summaryExpanded && (
            <div id="order-summary-content" className="border-t border-slate-200">
              <div className="max-h-90 divide-y divide-slate-200 overflow-y-auto">
                {lines.map((line, index) => (
                  <div key={String(line.product.id)} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-slate-400">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug text-slate-900">
                          {line.product.itemName}
                        </p>
                        <p className="mt-1 text-[11px] text-slate-500">
                          {formatRupiah(Number(line.product.price ?? 0))} / unit
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveLine(String(line.product.id))}
                        aria-label={`Hapus ${line.product.itemName}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between pl-8">
                      <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                        <button
                          type="button"
                          aria-label={`Kurangi ${line.product.itemName}`}
                          onClick={() => {
                            if (line.qty <= 1) onRemoveLine(String(line.product.id))
                            else onSetLineQty(String(line.product.id), line.qty - 1)
                          }}
                          className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex h-8 min-w-9 items-center justify-center border-x border-slate-300 px-2 text-xs font-bold tabular-nums text-slate-900">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          aria-label={`Tambah ${line.product.itemName}`}
                          onClick={() => onSetLineQty(String(line.product.id), line.qty + 1)}
                          className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <span className="text-sm font-bold tabular-nums text-slate-900">
                        {formatRupiah(Number(line.product.price ?? 0) * line.qty)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between text-xs text-slate-600">
                  <span>Total unit</span>
                  <span className="font-semibold tabular-nums">{totalQty}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-sm font-bold text-slate-800">Total pesanan</span>
                  <span className="text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
                    {formatRupiah(total)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Review & Konfirmasi <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Product catalogue */}
      <section className="relative z-20 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
              <Package2 size={17} />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Katalog Produk</h3>
              <p className="text-[11px] text-slate-500">Pilih item untuk pesanan customer</p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <div className="relative z-30">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              ref={productInputRef}
              value={productSearch}
              onChange={(e) => onProductSearch(e.target.value)}
              onFocus={() => setProductSuggestionsOpen(Boolean(productSearch.trim()))}
              onBlur={() => {
                setProductSuggestionsOpen(false)
                setActiveSuggestionIndex(-1)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  if (productSuggestionsOpen) {
                    e.preventDefault()
                    setProductSuggestionsOpen(false)
                    setActiveSuggestionIndex(-1)
                  }
                  return
                }

                if (!productSearch.trim()) return

                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault()
                  setProductSuggestionsOpen(true)
                  if (suggestionsLoading || productSuggestions.length === 0) return
                  setActiveSuggestionIndex((current) => {
                    if (e.key === 'ArrowDown') {
                      return current >= productSuggestions.length - 1 ? 0 : current + 1
                    }
                    return current <= 0 ? productSuggestions.length - 1 : current - 1
                  })
                } else if (
                  e.key === 'Enter' &&
                  productSuggestionsOpen &&
                  activeSuggestionIndex >= 0 &&
                  !suggestionsLoading
                ) {
                  const selected = productSuggestions[activeSuggestionIndex]
                  if (!selected) return
                  e.preventDefault()
                  openProductCart(selected.product)
                }
              }}
              placeholder="Cari nama atau kode produk"
              autoComplete="off"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={productSuggestionsOpen && searchingProducts}
              aria-controls="product-suggestions"
              aria-activedescendant={
                productSuggestionsOpen && activeSuggestionIndex >= 0
                  ? `product-option-${activeSuggestionIndex}`
                  : undefined
              }
              className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
            />
            {productSearch && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onProductSearch('')}
                aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
              >
                <X size={16} />
              </button>
            )}
            {productSuggestionsOpen && searchingProducts && (
              <div
                id="product-suggestions"
                role="listbox"
                aria-label="Pilihan produk"
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
              >
                {suggestionsLoading ? (
                  <div className="px-4 py-3 text-xs text-slate-500">Mencari produk...</div>
                ) : historyError || pricelistError ? (
                  <div className="px-4 py-3 text-xs text-red-600">Gagal mencari produk.</div>
                ) : productSuggestions.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-slate-500">Produk tidak ditemukan.</div>
                ) : (
                  productSuggestions.map(({ product, source }, index) => (
                    <button
                      key={String(product.id)}
                      id={`product-option-${index}`}
                      ref={(element) => {
                        suggestionRefs.current[index] = element
                      }}
                      type="button"
                      role="option"
                      aria-selected={activeSuggestionIndex === index}
                      onMouseEnter={() => setActiveSuggestionIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        openProductCart(product)
                      }}
                      className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-sky-50 focus-visible:bg-sky-50 ${activeSuggestionIndex === index ? 'bg-sky-50' : ''}`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          {product.itemName}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {product.itemCode} · {source}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-slate-700">
                        {typeof product.price === 'number'
                          ? formatRupiah(product.price)
                          : 'Harga belum tersedia'}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        {cartDialogProduct && (
          <div className="absolute h-0 w-0 overflow-visible [&>button]:hidden">
            <QtyControl
              key={String(cartDialogProduct.id)}
              product={cartDialogProduct}
              cardcode={selectedCustomer?.CardCode ?? undefined}
              listMode
              qty={
                lines.find((line) => String(line.product.id) === String(cartDialogProduct.id))
                  ?.qty ?? 0
              }
              onAdd={(pricedProduct, qty) => addLine(pricedProduct, qty ?? 1)}
              openRequest={cartOpenRequest}
              onDialogClose={() => {
                setCartDialogProduct(null)
                resetProductSearch()
              }}
            />
          </div>
        )}
        {!productSuggestionsOpen && (
          <>
            {!searchingProducts && (
              <div
                role="tablist"
                aria-label="Kelompok produk"
                className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-3"
              >
                {(
                  [
                    {
                      key: 'actual',
                      label: 'History Pembelian',
                      count: historyMeta?.total_records ?? 0,
                    },
                    {
                      key: 'pricelist',
                      label: 'Produk Lainnya',
                      count: pricelistMeta?.total_records ?? 0,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    role="tab"
                    aria-selected={productTab === tab.key}
                    onClick={() => setProductTab(tab.key)}
                    className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                      productTab === tab.key
                        ? 'border-sky-500 bg-white text-sky-700 shadow-sm ring-1 ring-sky-500'
                        : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span className="block text-xs font-bold">{tab.label}</span>
                    <span className="mt-1 block text-[11px]">{tab.count} produk</span>
                  </button>
                ))}
              </div>
            )}
            {searchingProducts && (
              <div className="border-t border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-800">
                Hasil pencarian dari History Pembelian dan Produk Lainnya
              </div>
            )}
            <div className="max-h-107.5 overflow-y-auto">
              {(
                [
                  {
                    key: 'actual',
                    title: 'History Pembelian',
                    description: 'Produk yang pernah dibeli customer',
                    products: historyProducts,
                    meta: historyMeta,
                    page: historyPage,
                    setPage: setHistoryPage,
                    loading: historyLoading,
                    error: historyError,
                  },
                  {
                    key: 'pricelist',
                    title: 'Produk Lainnya',
                    description: 'Produk yang belum pernah dibeli customer',
                    products: pricelistProducts,
                    meta: pricelistMeta,
                    page: pricelistPage,
                    setPage: setPricelistPage,
                    loading: pricelistLoading,
                    error: pricelistError,
                  },
                ] as const
              )
                .filter((group) => searchingProducts || group.key === productTab)
                .map((group) => (
                  <div key={group.key} className="border-t border-slate-200">
                    <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 px-4 py-3">
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">{group.title}</h4>
                        <p className="text-[11px] text-slate-500">{group.description}</p>
                      </div>
                      <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                        {group.meta?.total_records ?? 0} produk
                      </span>
                    </div>
                    {group.loading ? (
                      <Loader label={`Memuat ${group.title.toLowerCase()}...`} className="p-4" />
                    ) : group.error ? (
                      <p className="px-4 py-6 text-sm text-red-600">Gagal memuat produk.</p>
                    ) : group.products.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-500">
                        Tidak ada produk ditemukan.
                      </p>
                    ) : (
                      group.products.map((product) => {
                        const existing = lines.find(
                          (line) => String(line.product.id) === String(product.id),
                        )

                        return (
                          <SalesProductRow
                            key={String(product.id)}
                            product={product}
                            qty={existing?.qty ?? 0}
                            cardcode={selectedCustomer?.CardCode ?? undefined}
                            onAdd={addLine}
                            onQtyChange={onSetLineQty}
                            onRemove={onRemoveLine}
                            onDialogClose={resetProductSearch}
                          />
                        )
                      })
                    )}
                    {!group.loading && !group.error && (group.meta?.total_pages ?? 0) > 1 && (
                      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                        <button
                          type="button"
                          disabled={group.page <= 1}
                          onClick={() => group.setPage((page) => Math.max(1, page - 1))}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
                        >
                          Sebelumnya
                        </button>
                        <span className="text-xs text-slate-600">
                          Halaman {group.page} / {group.meta?.total_pages ?? 1}
                        </span>
                        <button
                          type="button"
                          disabled={group.page >= (group.meta?.total_pages ?? 1)}
                          onClick={() => group.setPage((page) => page + 1)}
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
                        >
                          Berikutnya
                        </button>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

export default ProductSelection
