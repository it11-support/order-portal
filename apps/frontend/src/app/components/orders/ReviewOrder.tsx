import { formatRupiah } from '@/lib/formatCurrency'
import { Customer, Product } from '@repo/shared'
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react'

type OrderLine = {
  product: Product
  qty: number
}
type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>

type ReviewOrderProps = {
  selectedCustomer: SelectedCustomer | null
  lines: OrderLine[]
  totalQty: number
  total: number
  notes: string
  posting: boolean
  activeDraftId: string | null

  onBack: () => void
  onCancelDraft: (draftId: string) => void | Promise<void>
  onSaveDraft: () => void | Promise<void>
  onRemoveLine: (productId: string) => void
  onSetLineQty: (productId: string, qty: number) => void
  onNotesChange: (value: string) => void
}

const ReviewOrder = (props: ReviewOrderProps) => {
  const {
    selectedCustomer,
    lines,
    totalQty,
    total,
    notes,
    posting,
    activeDraftId,
    onBack,
    onCancelDraft,
    onSaveDraft,
    onRemoveLine,
    onSetLineQty,
    onNotesChange,
  } = props

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
        <div>
          <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">Review Pesanan</h2>
        </div>

        <button
          type="button"
          onClick={() => onBack()}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50"
        >
          <ArrowLeft size={14} />
          Ubah
        </button>
        {activeDraftId && (
          <button
            type="button"
            onClick={() => onCancelDraft(activeDraftId)}
            disabled={posting}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 size={14} />
            Hapus Draft
          </button>
        )}
        <button
          type="button"
          onClick={() => void onSaveDraft()}
          disabled={posting}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
        >
          Simpan draft
        </button>
      </div>

      {/* CUSTOMER */}
      <div className="border-b border-slate-100 px-4 py-3.5">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Customer
        </p>
        <p className="text-sm font-bold text-slate-900">{selectedCustomer?.CardName}</p>
        <p className="mt-0.5 font-mono text-[11px] text-slate-500">{selectedCustomer?.CardCode}</p>
      </div>

      {/* ITEMS */}
      <div className="px-4 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-700">Rincian Produk</h3>
          <span className="text-[11px] text-slate-400">{lines.length} produk</span>
        </div>

        <div className="divide-y divide-slate-100">
          {lines.map((line) => (
            <div key={String(line.product.id)} className="py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold leading-snug text-slate-900">
                    {line.product.itemName}
                  </p>

                  <p className="mt-1 text-[11px] text-slate-500">
                    {typeof line.product.price === 'number'
                      ? formatRupiah(line.product.price)
                      : 'Harga belum tersedia'}
                    {' / unit'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveLine(String(line.product.id))}
                  aria-label={`Hapus ${line.product.itemName}`}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                  <button
                    type="button"
                    aria-label="Kurangi quantity"
                    onClick={() => {
                      const next = line.qty - 1
                      if (next <= 0) {
                        onRemoveLine(String(line.product.id))
                      } else {
                        onSetLineQty(String(line.product.id), next)
                      }
                    }}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-sky-700"
                  >
                    <Minus size={14} />
                  </button>

                  <input
                    type="number"
                    min={1}
                    value={line.qty}
                    onChange={(e) => onSetLineQty(String(line.product.id), Number(e.target.value))}
                    className="h-8 w-10 border-x border-slate-100 bg-transparent text-center text-xs font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />

                  <button
                    type="button"
                    aria-label="Tambah quantity"
                    onClick={() => onSetLineQty(String(line.product.id), line.qty + 1)}
                    className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-sky-700"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <p className="text-sm font-semibold tabular-nums text-slate-900">
                  {formatRupiah(Number(line.product.price ?? 0) * line.qty)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TOTAL */}
      <div className="mx-4 mt-2 border-t border-slate-200 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-slate-500">Total Pesanan</p>
            <p className="mt-0.5 text-[11px] text-slate-400">{totalQty} unit</p>
          </div>

          <p className="text-xl font-bold tracking-tight tabular-nums text-slate-900">
            {formatRupiah(total)}
          </p>
        </div>
      </div>

      {/* NOTES */}
      <div className="border-t border-slate-100 px-4 py-4">
        <label
          htmlFor="order-notes"
          className="mb-2 block text-[11px] font-semibold text-slate-600"
        >
          Catatan untuk Customer
          <span className="ml-1 font-normal text-slate-400">(Opsional)</span>
        </label>

        <textarea
          id="order-notes"
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          rows={3}
          placeholder="Tambahkan instruksi atau catatan pesanan..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
        />
      </div>
    </section>
  )
}

export default ReviewOrder
