import { Building2, Trash2 } from 'lucide-react'
import { ProductSelectionProps } from './types'

type SelectedCustomerHeaderProps = ProductSelectionProps['customer'] & {
  hasLines: boolean
}

const SelectedCustomerHeader = (props: SelectedCustomerHeaderProps) => {
  const { selectedCustomer, activeDraftId, posting, onBack, onCancelDraft, onSaveDraft, hasLines } =
    props
  return (
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
        {hasLines && (
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
  )
}

export default SelectedCustomerHeader
