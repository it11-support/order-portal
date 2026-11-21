import { useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@lib'
import type { Customer, Order } from '@repo/shared'
import type { SelectedCustomer, DraftCustomerFields } from './types'
import type { useOrderForm } from './useOrderForm'
import type { useOrderLines } from './useOrderLines'
import type { useCustomerSearch } from './useCustomerSearch'
import { mapDraftItemsToCart } from '@/app/utils'

type Args = {
  orders: Order[]
  customers: Customer[]
  incomingDraft?: Order
  refreshOrders: () => Promise<unknown>
  submitForCustomer: (payload: {
    kind: 'order'
    customerId: string
    items: { productId: string; qty: number }[]
    notes: string
  }) => Promise<unknown>
  form: ReturnType<typeof useOrderForm>
  cart: ReturnType<typeof useOrderLines>
  customerSearch: ReturnType<typeof useCustomerSearch>
}
export const useOrderDraft = ({
  orders,
  customers,
  incomingDraft,
  refreshOrders,
  submitForCustomer,
  form,
  cart,
  customerSearch,
}: Args) => {
  const location = useLocation()
  const navigate = useNavigate()
  const resumedDraftRef = useRef<string | null>(null)
  const {
    customerId,
    activeDraftId,
    activeDraftVersion,
    notes,
    posting,
    setPosting,
    setSelectedCustomer,
    setActiveDraftId,
    setActiveDraftVersion,
    setNotes,
    setProductSearch,
    setProductTab,
    setHistoryPage,
    setPricelistPage,
    setStep,
  } = form

  const { lines, setLines } = cart
  const { setSearch } = customerSearch
  // Drafts for the selected customer are already loaded by OrderContext
  // (scoped to the sales person's territory). Filter locally.
  const allDrafts = useMemo(
    () =>
      orders
        .filter((o) => o.kind === 'order' && o.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  )

  const resumeDraft = (draft: Order): boolean => {
    if (draft.status !== 'draft' || draft.kind !== 'order') {
      toast.error('Pesanan ini bukan draft order')
      return false
    }

    const details = draft as Order & DraftCustomerFields
    const draftCustomerId = details.customerId ?? draft.userId
    if (draftCustomerId == null || String(draftCustomerId) === '') {
      toast.error('Customer draft tidak valid')
      return false
    }

    // Use a complete customer when cached, otherwise retain the customer identity
    // carried by the draft. Do not fabricate a full Customer object.
    const cachedCustomer = customers.find((item) => String(item.id) === String(draftCustomerId))
    const embeddedCustomer = details.customer
    const customer: SelectedCustomer = cachedCustomer ?? {
      ...embeddedCustomer,
      id: draftCustomerId as Customer['id'],
      CardName: embeddedCustomer?.CardName ?? draft.company ?? draft.userName ?? 'Customer',
      CardCode: embeddedCustomer?.CardCode ?? details.CardCode ?? details.cardCode ?? '',
    }

    const draftLines = mapDraftItemsToCart(draft.items ?? [])

    setSelectedCustomer(customer)
    setLines(draftLines)
    setNotes(draft.notes ?? '')
    setActiveDraftId(draft.id)
    setActiveDraftVersion((draft as Order & { updatedAt?: string }).updatedAt ?? null)
    setProductSearch('')
    setProductTab('actual')
    setHistoryPage(1)
    setPricelistPage(1)
    setStep('product')
    return true
  }

  // Navigation from AdminOrdersPage passes the existing draft; no GET /customers/:id.
  useEffect(() => {
    if (!incomingDraft || resumedDraftRef.current === incomingDraft.id) return
    if (!resumeDraft(incomingDraft)) return
    resumedDraftRef.current = incomingDraft.id
    navigate(location.pathname, { replace: true, state: null })
    // Consume the navigation payload once; cached customer is optional.
  }, [incomingDraft, location.pathname, navigate])

  const saveDraft = async () => {
    if (!customerId || !lines.length || posting) return
    setPosting(true)
    try {
      const payload = {
        items: lines.map((line) => ({ productId: String(line.product.id), qty: line.qty })),
        notes,
      }
      const response = activeDraftId
        ? await api.patch(`/requests/${activeDraftId}`, {
            ...payload,
            ...(activeDraftVersion ? { updatedAt: activeDraftVersion } : {}),
          })
        : await api.post('/requests', { kind: 'order', customerId, ...payload, status: 'draft' })
      if (!activeDraftId) setActiveDraftId(response.data.data.id)
      await refreshOrders()
      const latest = activeDraftId ? await api.get(`/requests/${activeDraftId}`) : response
      setActiveDraftVersion(latest.data.data.updatedAt ?? null)
      toast.success('Draft tersimpan')
    } catch {
      toast.error('Gagal menyimpan draft')
    } finally {
      setPosting(false)
    }
  }

  const cancelDraft = async (id: string) => {
    if (posting) return
    setPosting(true)
    try {
      await api.patch(`/requests/${id}`, { status: 'cancelled' })
      await refreshOrders()
      if (activeDraftId === id) {
        setActiveDraftId(null)
        setActiveDraftVersion(null)
        setLines([])
        setNotes('')
        setSelectedCustomer(null)
        setSearch('')
        setProductSearch('')
        setProductTab('actual')
        setHistoryPage(1)
        setPricelistPage(1)
        setStep('customer')
      }
      toast.success('Draft dihapus')
    } catch {
      toast.error('Gagal menghapus draft')
    } finally {
      setPosting(false)
    }
  }

  const submit = async () => {
    if (!customerId || !lines.length || posting) return
    setPosting(true)
    try {
      if (activeDraftId) {
        await api.patch(`/requests/${activeDraftId}`, {
          status: 'pending',
          notes,
          items: lines.map((line) => ({ productId: String(line.product.id), qty: line.qty })),
          ...(activeDraftVersion ? { updatedAt: activeDraftVersion } : {}),
        })
        await refreshOrders()
        toast.success('Draft dikirim sebagai pesanan')
      } else {
        await toast.promise(
          submitForCustomer({
            kind: 'order',
            customerId,
            items: lines.map((line) => ({ productId: String(line.product.id), qty: line.qty })),
            notes,
          }),
          {
            loading: 'Mengirim order...',
            success: 'Order tersimpan',
            error: 'Gagal menyimpan order',
          },
        )
      }
      setActiveDraftId(null)
      setActiveDraftVersion(null)
      setLines([])
      setNotes('')
      setSearch('')
      setSelectedCustomer(null)
      setStep('customer')
    } catch {
      toast.error('Gagal mengirim order')
    } finally {
      setPosting(false)
    }
  }
  return { allDrafts, resumeDraft, saveDraft, cancelDraft, submit }
}
