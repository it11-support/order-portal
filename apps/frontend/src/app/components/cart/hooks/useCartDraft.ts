import { useMemo, useState } from 'react'
import useSWRMutation from 'swr/mutation'
import { toast } from 'sonner'
import { api } from '@lib'
import { useCart, useOrders } from '@contexts'
import { useActiveDraft } from '@hooks'
import { useCartSummary } from './useCartSummary'

type DraftUpdate = { items?: Array<{ productId: string; qty: number }>; status?: 'pending' }
const patchDraft = async (url: string, { arg }: { arg: DraftUpdate }) => {
  const response = await api.patch(url, arg)
  return response.data
}

export const useCartDraft = (onResetPriceChanges: () => void) => {
  const { cart, setCart } = useCart()
  const { orders, refreshOrders, submitting } = useOrders()
  const { editingDraftId, setEditingDraftId } = useActiveDraft()
  const { getItems } = useCartSummary()
  const [draftBusy, setDraftBusy] = useState(false)

  // Orders remain owned by OrderContext; SWR Mutation handles draft writes.
  const savedDrafts = useMemo(
    () => orders.filter((o) => o.kind === 'order' && o.status === 'draft'),
    [orders],
  )
  const activeDraftId = savedDrafts.some((o) => o.id === editingDraftId) ? editingDraftId : null
  const { trigger: updateDraft, isMutating } = useSWRMutation(
    activeDraftId ? `/requests/${activeDraftId}` : null,
    patchDraft,
  )

  const openDraft = (id: string) => {
    const draft = savedDrafts.find((o) => o.id === id)
    if (!draft || activeDraftId === id) return
    if (
      cart.length > 0 &&
      !window.confirm(
        'Ganti isi keranjang aktif dengan draft ini? Perubahan yang belum disimpan akan hilang.',
      )
    )
      return
    const validItems = (draft.items ?? []).filter((item) => item.product?.id != null)
    if (validItems.length !== (draft.items ?? []).length) {
      toast.error('Sebagian produk draft tidak tersedia. Draft tidak dibuka.')
      return
    }
    setCart(
      validItems.map((item) => ({
        product: {
          ...item.product,
          id: Number(item.product.id),
          price: item.price ?? item.product.price ?? null,
          currency: item.currency ?? item.product.currency ?? null,
          priceSource: item.priceSource ?? item.product.priceSource ?? null,
        },
        qty: item.qty ?? 1,
      })),
    )
    setEditingDraftId(id)
    onResetPriceChanges()
    toast.success('Draft dibuka di keranjang')
  }

  const saveActiveDraft = async (send = false) => {
    if (!activeDraftId || draftBusy || isMutating || submitting) return
    const items = getItems()
    if (!items.length) {
      toast.error('Draft tidak boleh kosong. Hapus draft melalui daftar draft.')
      return
    }
    setDraftBusy(true)
    try {
      await updateDraft({ items })
      if (send) await updateDraft({ status: 'pending' })
      await refreshOrders()
      setCart([])
      setEditingDraftId(null)
      onResetPriceChanges()
      toast.success(send ? 'Order berhasil dikirim' : 'Draft berhasil disimpan')
    } catch (e) {
      console.error('Gagal memproses draft', e)
      toast.error('Gagal memproses draft. Item tetap di keranjang.')
    } finally {
      setDraftBusy(false)
    }
  }

  return {
    savedDrafts,
    activeDraftId,
    draftBusy: draftBusy || isMutating,
    openDraft,
    saveActiveDraft,
  }
}
