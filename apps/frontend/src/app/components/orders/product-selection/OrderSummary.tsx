import { ArrowRight, ChevronDown, ClipboardList, Minus, Plus, Trash2 } from 'lucide-react'
import { OrderLine } from './types'
import { formatRupiah } from '@/lib/formatCurrency'
import { useState } from 'react'

type OrderSummaryProps = {
  lines: OrderLine[]
  totalQty: number
  total: number
  onRemoveLine: (productId: string) => void
  onSetLineQty: (productId: string, qty: number) => void
  onConfirm: () => void
}

const OrderSummary = (props: OrderSummaryProps) => {
  const { lines, totalQty, total, onRemoveLine, onSetLineQty, onConfirm } = props
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  return (
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
  )
}

export default OrderSummary
