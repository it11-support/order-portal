import { ChevronRight, FileText } from 'lucide-react'
import { SavedDraftsProps } from './types'

const SavedDrafts = ({
  drafts,
  expandedDraftId,
  editingDraftId,
  draftActionId,
  savingDraft,
  onExpand,
  onContinue,
  onCancel,
}: SavedDraftsProps) => {
  if (drafts.length === 0) return null

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <h2 className="text-sm font-bold">Draft Tersimpan</h2>
        </div>

        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">
          {drafts.length} draft
        </span>
      </div>

      <div className="space-y-2">
        {drafts.map((draft) => {
          const expanded = expandedDraftId === draft.id
          const items = draft.items ?? []
          const qty = items.reduce((sum, item) => sum + (item.qty ?? 0), 0)

          return (
            <div key={draft.id} className="rounded-xl border border-border bg-white p-3">
              <button
                type="button"
                onClick={() => onExpand(expanded ? null : draft.id)}
                aria-expanded={expanded}
                className="flex w-full items-center justify-between gap-3 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Draft ·{' '}
                    {new Date(draft.createdAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>

                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {items.length} jenis produk · {qty} unit
                  </p>
                </div>

                <ChevronRight
                  size={18}
                  className={`transition-transform ${expanded ? 'rotate-90' : ''}`}
                />
              </button>

              {expanded && (
                <div className="mt-3 space-y-3 border-t pt-3">
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div
                        key={`${item.product?.id ?? index}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-xl border bg-secondary/20 p-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">
                            {item.product?.itemName ?? 'Produk'}
                          </p>

                          <p className="mt-1 text-xs text-muted-foreground">{item.qty ?? 0} unit</p>
                        </div>

                        <span className="text-xs font-bold">× {item.qty ?? 0}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onContinue(draft)}
                      disabled={savingDraft || draftActionId !== null}
                      className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {editingDraftId === draft.id ? 'Cart Aktif' : 'Lanjutkan'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onCancel(draft.id)}
                      disabled={savingDraft || draftActionId !== null}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                    >
                      {draftActionId === draft.id ? 'Menghapus...' : 'Hapus Draft'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default SavedDrafts
