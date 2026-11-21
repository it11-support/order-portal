import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { api } from '@lib'
import { useActiveDraft } from '@hooks'
import { useCart, useOrders } from '@contexts'
import { mapDraftItemsToCart } from '@/app/utils'

type CartLine = {
  product: { id: number | string }
  qty?: number
}

const uniqueCartLines = <T extends CartLine>(lines: T[]): T[] => {
  const byProduct = new Map<string, T>()

  for (const line of lines) {
    byProduct.set(String(line.product.id), line)
  }

  return [...byProduct.values()]
}

const orderItems = (lines: CartLine[]) =>
  uniqueCartLines(lines)
    .filter((item) => Number(item.qty ?? 0) > 0)
    .map((item) => ({
      productId: String(item.product.id),
      qty: Number(item.qty),
    }))

export const useCatalogDrafts = (isCustomer: boolean) => {
  const { cart, setCart } = useCart()
  const { orders, refreshOrders } = useOrders()
  const { editingDraftId, setEditingDraftId } = useActiveDraft()

  const [savingDraft, setSavingDraft] = useState(false)
  const [draftActionId, setDraftActionId] = useState<string | null>(null)
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null)

  const cartBeforeEditing = useRef<typeof cart | null>(null)
  const catalogRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isCustomer) void refreshOrders()
  }, [isCustomer, refreshOrders])

  const savedDrafts = useMemo(
    () =>
      orders
        .filter((order) => order.kind === 'order' && order.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  )

  type SavedDraft = (typeof savedDrafts)[number]

  const continueDraft = (draft: SavedDraft) => {
    if (editingDraftId === draft.id) {
      catalogRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
      return
    }

    if (
      editingDraftId &&
      !window.confirm('Ganti draft aktif? Perubahan yang belum disimpan akan hilang.')
    ) {
      return
    }

    if (
      !editingDraftId &&
      cart.length > 0 &&
      !window.confirm(
        'Ganti isi keranjang aktif dengan item draft ini? Item yang belum disimpan akan hilang dari keranjang aktif.',
      )
    ) {
      return
    }

    if (!editingDraftId) {
      cartBeforeEditing.current = cart.map((item) => ({
        ...item,
      }))
    }

    setCart(uniqueCartLines(mapDraftItemsToCart(draft.items ?? [])))

    setEditingDraftId(draft.id)
    setExpandedDraftId(null)

    toast.success('Draft dipilih sebagai keranjang aktif')

    requestAnimationFrame(() => {
      catalogRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    })
  }

  const exitDraftEdit = () => {
    setCart([])
    setEditingDraftId(null)
    setExpandedDraftId(null)
    cartBeforeEditing.current = null
  }

  useEffect(() => {
    if (!isCustomer || cart.length < 2) return

    const unique = uniqueCartLines(cart)

    if (unique.length !== cart.length) {
      setCart(unique)
    }
  }, [cart, isCustomer, setCart])

  const confirmExitDraft = () => {
    if (!editingDraftId || savingDraft) return

    if (
      !window.confirm('Keluar dari draft aktif? Perubahan lokal yang belum disimpan akan dibuang.')
    ) {
      return
    }

    exitDraftEdit()
    toast.success('Keluar dari draft aktif')
  }

  const saveEditedDraft = async (submit = false) => {
    if (!editingDraftId || savingDraft) return

    setSavingDraft(true)

    try {
      const id = editingDraftId
      const items = orderItems(cart)

      if (items.length === 0) {
        await api.patch(`/requests/${id}`, {
          status: 'cancelled',
        })

        toast.success('Draft kosong dibatalkan')
      } else {
        await api.patch(`/requests/${id}`, { items })

        if (submit) {
          await api.patch(`/requests/${id}`, {
            status: 'pending',
          })

          toast.success('Order berhasil dikirim')
        } else {
          toast.success('Perubahan draft tersimpan')
        }
      }

      setCart([])
      cartBeforeEditing.current = null
      setEditingDraftId(null)
      setExpandedDraftId(null)

      await refreshOrders()
    } catch (error) {
      console.error('Gagal memproses draft', error)
      toast.error('Gagal memproses draft. Perubahan tetap berada di keranjang.')
    } finally {
      setSavingDraft(false)
    }
  }

  const cancelSavedDraft = async (id: string) => {
    if (draftActionId || savingDraft) return

    setDraftActionId(id)

    try {
      await api.patch(`/requests/${id}`, {
        status: 'cancelled',
      })

      await refreshOrders()

      if (expandedDraftId === id) {
        setExpandedDraftId(null)
      }

      if (editingDraftId === id) {
        exitDraftEdit()
      }

      toast.success('Draft dihapus')
    } catch (error) {
      console.error('Gagal menghapus draft', error)
      toast.error('Gagal menghapus draft')
    } finally {
      setDraftActionId(null)
    }
  }

  const saveCustomerDraft = async () => {
    if (editingDraftId) {
      await saveEditedDraft()
      return
    }

    const items = orderItems(cart)

    if (items.length === 0) {
      toast.error('Draft kosong tidak dapat disimpan atau dikirim.')
      return
    }

    setSavingDraft(true)

    try {
      await api.post('/requests', {
        kind: 'order',
        status: 'draft',
        items,
      })

      setCart([])
      await refreshOrders()

      toast.success('Draft berhasil disimpan')
    } catch (error) {
      console.error('Gagal menyimpan draft customer', error)
      toast.error('Gagal menyimpan draft. Keranjang tetap tersimpan.')
    } finally {
      setSavingDraft(false)
    }
  }

  return {
    cart,
    savedDrafts,
    savingDraft,
    draftActionId,
    expandedDraftId,
    setExpandedDraftId,
    editingDraftId,
    catalogRef,
    continueDraft,
    exitDraftEdit,
    saveEditedDraft,
    cancelSavedDraft,
    saveCustomerDraft,
    confirmExitDraft,
  }
}
