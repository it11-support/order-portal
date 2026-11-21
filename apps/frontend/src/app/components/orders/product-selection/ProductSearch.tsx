import { Search, X } from 'lucide-react'
import { formatRupiah } from '@/lib/formatCurrency'
import type { Product } from '@repo/shared'
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from 'react'
import type { ProductSuggestion } from './types'
import { handleComboboxKeyDown } from '@/app/hooks'

type ProductSearchProps = {
  productSearchRef: RefObject<HTMLInputElement | null>
  productSearch: string
  onProductSearch: (value: string) => void
  productSuggestionsOpen: boolean
  setProductSuggestionsOpen: Dispatch<SetStateAction<boolean>>
  activeSuggestionIndex: number
  setActiveSuggestionIndex: Dispatch<SetStateAction<number>>
  suggestionsLoading: boolean
  productSuggestions: ProductSuggestion[]
  suggestionRefs: MutableRefObject<(HTMLButtonElement | null)[]>
  openProductCart: (product: Product) => void
  searchingProducts: boolean
  historyError: unknown
  pricelistError: unknown
}

export const ProductSearch = ({
  productSearchRef,
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
}: ProductSearchProps) => {
  const showSuggestions = productSuggestionsOpen && searchingProducts

  return (
    <div className="p-3 sm:p-4">
      <div className="relative z-30">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          ref={productSearchRef}
          value={productSearch}
          onChange={(e) => onProductSearch(e.target.value)}
          onFocus={() => setProductSuggestionsOpen(Boolean(productSearch.trim()))}
          onBlur={() => {
            setProductSuggestionsOpen(false)
            setActiveSuggestionIndex(-1)
          }}
          onKeyDown={(event) =>
            handleComboboxKeyDown(event, {
              query: productSearch,
              open: showSuggestions,
              ready: searchingProducts && !suggestionsLoading,
              items: productSuggestions,
              activeIndex: activeSuggestionIndex,
              setOpen: setProductSuggestionsOpen,
              setActiveIndex: setActiveSuggestionIndex,
              onSelect: ({ product }) => openProductCart(product),
              selectFirstOnEnter: false,
            })
          }
          placeholder="Cari nama atau kode produk"
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? 'product-suggestions' : undefined}
          aria-activedescendant={
            showSuggestions && activeSuggestionIndex >= 0
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

        {showSuggestions && (
          <div
            id="product-suggestions"
            role="listbox"
            aria-label="Pilihan produk"
            className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl"
          >
            {suggestionsLoading ? (
              <div
                role="status"
                aria-label="Mencari produk"
                className="flex items-center justify-center px-4 py-5"
              >
                <span
                  aria-hidden="true"
                  className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
                />
                <span className="sr-only">Mencari produk...</span>
              </div>
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
                  onClick={() => openProductCart(product)}
                  className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-sky-50 focus-visible:bg-sky-50 ${
                    activeSuggestionIndex === index ? 'bg-sky-50' : ''
                  }`}
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
  )
}
