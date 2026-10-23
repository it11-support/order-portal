import { useMemo, useState } from 'react'
import { FileText, ChevronRight } from 'lucide-react'
import { useCart, useOrders } from '@contexts'
import { api } from '@lib'
import { toast } from 'sonner'
import { useActiveDraft } from '../hooks/useActiveDraft'

export default function DraftOrdersList() {
  const { orders, refreshOrders } = useOrders()
  const { cart, setCart } = useCart()
  const { editingDraftId, setEditingDraftId } = useActiveDraft()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const drafts = useMemo(
    () =>
      orders
        .filter((o) => o.kind === 'order' && o.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  )

  const openDraft = (draft: (typeof drafts)[number]) => {
    if (editingDraftId === draft.id) return
    if (
      cart.length &&
      !window.confirm(
        'Ganti isi keranjang aktif dengan draft ini? Perubahan yang belum disimpan akan hilang.',
      )
    )
      return
    const lines = (draft.items ?? [])
      .filter((item) => item.product?.id != null)
      .map((item) => ({
        product: {
          ...item.product!,
          id: Number(item.product!.id),
          price: item.price ?? item.product!.price ?? null,
          currency: item.currency ?? item.product!.currency ?? null,
          priceSource: item.priceSource ?? item.product!.priceSource ?? null,
        },
        qty: item.qty ?? 1,
      }))
    setCart(lines)
    setEditingDraftId(draft.id)
    setExpandedId(null)
    toast.success('Draft dibuka di keranjang aktif')
  }

  const removeDraft = async (id: string) => {
    if (busyId || !window.confirm('Hapus draft ini?')) return
    setBusyId(id)
    try {
      await api.patch(`/requests/${id}`, { status: 'cancelled' })
      if (editingDraftId === id) {
        setEditingDraftId(null)
        setCart([])
      }
      await refreshOrders()
      toast.success('Draft dihapus')
    } catch {
      toast.error('Gagal menghapus draft')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-3" aria-label="Draft order di keranjang">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <FileText size={18} /> Keranjang · Draft Order
        </h2>
        <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{drafts.length} draft</span>
      </div>
      {drafts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Belum ada draft tersimpan.</p>
      ) : (
        drafts.map((draft) => {
          const items = draft.items ?? []
          const expanded = expandedId === draft.id
          return (
            <div key={draft.id} className="rounded-xl border border-border bg-white p-3">
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() => setExpandedId(expanded ? null : draft.id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">
                    Draft · {new Date(draft.createdAt).toLocaleDateString('id-ID')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {items.length} produk · {items.reduce((n, item) => n + (item.qty ?? 0), 0)} unit{' '}
                    {editingDraftId === draft.id ? '· Aktif' : ''}
                  </p>
                </div>
                <ChevronRight size={18} className={expanded ? 'rotate-90' : ''} />
              </button>
              {expanded && (
                <div className="mt-3 space-y-3 border-t border-border pt-3">
                  {items.map((item, index) => (
                    <p key={`${item.product?.id ?? index}-${index}`} className="text-xs">
                      {item.product?.itemName ?? 'Produk'} · {item.qty ?? 0} unit
                    </p>
                  ))}
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openDraft(draft)}
                      disabled={busyId !== null}
                      className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white"
                    >
                      {editingDraftId === draft.id ? 'Cart Aktif' : 'Lanjutkan'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeDraft(draft.id)}
                      disabled={busyId !== null}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600"
                    >
                      {busyId === draft.id ? 'Menghapus...' : 'Hapus'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
