import { useMemo } from 'react'
import { SalesProductRow } from '../SalesProductRow'
import { Loader } from '../../common'

import type { ProductSelectionProps } from './types'

type Catalog = ProductSelectionProps['catalog']
type Order = ProductSelectionProps['order']

type ProductCatalogGroupProps = {
  group: {
    key: 'actual' | 'pricelist'
    title: string
    description: string
    products: Catalog['historyProducts']
    meta?: Catalog['historyMeta']
    page: number
    setPage: Catalog['setHistoryPage']
    loading: boolean
    error: unknown
  }
  order: Pick<Order, 'lines' | 'addLine' | 'onSetLineQty' | 'onRemoveLine'>
  cardcode?: string
  resetProductSearch: () => void
}

const ProductCatalogGroup = ({
  group,
  order,
  cardcode,
  resetProductSearch,
}: ProductCatalogGroupProps) => {
  const { title, description, products, meta, page, setPage, loading, error } = group

  const { lines, addLine, onSetLineQty, onRemoveLine } = order

  const qtyByProductId = useMemo(
    () => new Map(lines.map((line) => [String(line.product.id), line.qty])),
    [lines],
  )

  return (
    <div className="border-t border-slate-200">
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 px-4 py-3">
        <div>
          <h4 className="text-xs font-bold text-slate-800">{title}</h4>
          <p className="text-[11px] text-slate-500">{description}</p>
        </div>

        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
          {meta?.total_records ?? 0} produk
        </span>
      </div>

      {loading ? (
        <Loader label={`Memuat ${title.toLowerCase()}...`} className="p-4" />
      ) : error ? (
        <p className="px-4 py-6 text-sm text-red-600">Gagal memuat produk.</p>
      ) : products.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">Tidak ada produk ditemukan.</p>
      ) : (
        products.map((product) => (
          <SalesProductRow
            key={String(product.id)}
            product={product}
            qty={qtyByProductId.get(String(product.id)) ?? 0}
            cardcode={cardcode}
            onAdd={addLine}
            onQtyChange={onSetLineQty}
            onRemove={onRemoveLine}
            onDialogClose={resetProductSearch}
          />
        ))
      )}

      {!loading && !error && (meta?.total_pages ?? 0) > 1 && (
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Sebelumnya
          </button>

          <span className="text-xs text-slate-600">
            Halaman {page} / {meta?.total_pages ?? 1}
          </span>

          <button
            type="button"
            disabled={page >= (meta?.total_pages ?? 1)}
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}
    </div>
  )
}

export default ProductCatalogGroup
