import { useEffect, useMemo, useState } from 'react'
import { FileText, ChevronRight, Trash2 } from 'lucide-react'
import { useOrders } from '@contexts'
import { api } from '@lib'
import { toast } from 'sonner'

type Props = {
  onOpenDraft: (id: string) => void
  activeDraftId?: string | null
}

export default function CartDraftSection({ onOpenDraft, activeDraftId }: Props) {
  const { orders, refreshOrders } = useOrders()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { void refreshOrders() }, [refreshOrders])

  const drafts = useMemo(() => orders
    .filter(order => order.kind === 'order' && order.status === 'draft')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [orders])

  const removeDraft = async (id: string) => {
    if (busyId || activeDraftId === id) return
    if (!window.confirm('Hapus draft ini?')) return
    setBusyId(id)
    try {
      await api.patch(`/requests/${id}`, { status: 'cancelled' })
      await refreshOrders()
      toast.success('Draft dihapus')
    } catch {
      toast.error('Gagal menghapus draft')
    } finally { setBusyId(null) }
  }

  if (!drafts.length) return null

  return (
    <section className="space-y-3" aria-label="Draft Tersimpan">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold"><FileText size={18} /> Draft Tersimpan</h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{drafts.length} draft</span>
      </div>
      {drafts.map(draft => {
        const items = draft.items ?? []
        const expanded = expandedId === draft.id
        const isActive = activeDraftId === draft.id
        return (
          <div key={draft.id} className="rounded-xl border border-border bg-white p-3">
            <button type="button" onClick={() => setExpandedId(expanded ? null : draft.id)}
              aria-expanded={expanded} className="flex w-full items-center justify-between gap-2 text-left">
              <div>
                <p className="text-sm font-semibold">Draft · {new Date(draft.createdAt).toLocaleDateString('id-ID')}</p>
                <p className="text-xs text-muted-foreground">{items.length} jenis produk · {items.reduce((n, item) => n + (item.qty ?? 0), 0)} unit{isActive ? ' · Aktif' : ''}</p>
              </div>
              <ChevronRight size={18} className={expanded ? 'rotate-90' : ''} />
            </button>
            {expanded && (
              <div className="mt-3 space-y-3 border-t border-border pt-3">
                <div className="space-y-1">
                  {items.map((item, index) => <p key={`${item.product?.id ?? index}-${index}`} className="text-xs">
                    {item.product?.itemName ?? 'Produk'} × {item.qty ?? 0}
                  </p>)}
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => onOpenDraft(draft.id)} disabled={!!busyId}
                    className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white">{isActive ? 'Cart Aktif' : 'Lanjutkan'}</button>
                  <button type="button" onClick={() => void removeDraft(draft.id)} disabled={!!busyId || isActive}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50">
                    <Trash2 size={13} /> {busyId === draft.id ? 'Menghapus...' : 'Hapus'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
