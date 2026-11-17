import { ClipboardList, Trash2 } from 'lucide-react'

export type OrderDraftItem = {
  id: string
  company?: string | null
  userName?: string | null
  items?: unknown[] | null
}

type OrderDraftProps<T extends OrderDraftItem> = {
  drafts: T[]
  onResume: (draft: T) => boolean | void | Promise<void>
  onCancel: (draftId: string) => void | Promise<void>
  disabled?: boolean
}

export const OrderDraft = <T extends OrderDraftItem>({
  drafts,
  onResume,
  onCancel,
  disabled = false,
}: OrderDraftProps<T>) => {
  if (drafts.length === 0) return null

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
            <ClipboardList size={17} />
          </span>

          <div>
            <h3 className="text-sm font-bold text-slate-900">Draft Tersimpan</h3>
            <p className="text-[11px] text-slate-500">Lanjutkan pesanan yang masih dikerjakan</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {drafts.map((draft) => {
          const customerName = draft.company ?? draft.userName ?? 'Customer'

          return (
            <div
              key={draft.id}
              className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 transition-colors hover:bg-slate-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{customerName}</p>

                <p className="mt-0.5 font-mono text-xs text-slate-500">
                  Draft #{draft.id} · {draft.items?.length ?? 0} item
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onResume(draft)}
                  className="rounded-lg bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100 disabled:opacity-50"
                >
                  Lanjutkan
                </button>

                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => void onCancel(draft.id)}
                  className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  aria-label={`Hapus draft ${draft.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
