import { Package2 } from 'lucide-react'
import { useEffect } from 'react'
import { QtyControl } from '../../qty-control/QtyControl'
import SelectedCustomerHeader from './SelectedCustomerHeader'
import OrderSummary from './OrderSummary'
import { ProductSearch } from './ProductSearch'
import ProductCatalogGroup from './ProductCatalogGroup'
import type { ProductSelectionProps } from './types'

const ProductSelection = ({
  customer,
  order,
  search,
  catalog,
  cartDialog,
}: ProductSelectionProps) => {
  const { selectedCustomer } = customer

  const { addLine } = order

  const { productSearchRef, resetProductSearch, productSuggestionsOpen, searchingProducts } = search

  const {
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
    historyError,
    pricelistError,
  } = catalog

  const { cartDialogProduct, setCartDialogProduct, cartOpenRequest } = cartDialog

  useEffect(() => {
    if (!selectedCustomer?.CardCode) return

    productSearchRef.current?.focus()
  }, [selectedCustomer?.CardCode, productSearchRef])

  return (
    <div className="space-y-3">
      {/* Active account context */}
      <SelectedCustomerHeader {...customer} hasLines={order.lines.length > 0} />

      {/* Selected lines / order summary */}
      {order.lines.length > 0 && <OrderSummary {...order} />}

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

        <ProductSearch
          {...search}
          historyError={catalog.historyError}
          pricelistError={catalog.pricelistError}
        />

        {cartDialogProduct && (
          <div className="absolute h-0 w-0 overflow-visible [&>button]:hidden">
            <QtyControl
              key={String(cartDialogProduct.id)}
              product={cartDialogProduct}
              cardcode={selectedCustomer?.CardCode ?? undefined}
              listMode
              qty={
                order.lines.find((line) => String(line.product.id) === String(cartDialogProduct.id))
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
        <div hidden={productSuggestionsOpen}>
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
                <ProductCatalogGroup
                  key={group.key}
                  group={group}
                  order={order}
                  cardcode={customer.selectedCustomer.CardCode ?? undefined}
                  resetProductSearch={search.resetProductSearch}
                />
              ))}
          </div>
        </div>
      </section>
    </div>
  )
}

export default ProductSelection
