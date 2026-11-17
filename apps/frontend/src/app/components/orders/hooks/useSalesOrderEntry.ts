import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { Customer, Order, Product } from '@repo/shared'

export type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>
export type OrderLine = { product: Product; qty: number }

export type DraftCustomerFields = {
  customerId?: string | number | null
  CardCode?: string | null
  cardCode?: string | null
  customer?: Partial<Customer> | null
}

type UseSalesOrderEntryOptions = {
  orders: Order[]
  customers: Customer[]
  historyProducts: Product[]
  pricelistProducts: Product[]
  incomingDraft?: Order | null
  posting: boolean
  setPosting: (value: boolean) => void
  refreshOrders: () => Promise<unknown>
  submitForCustomer: (payload: {
    kind: 'order'
    customerId: string
    items: { productId: string; qty: number }[]
    notes: string
  }) => Promise<unknown>
  api: {
    post: (url: string, payload: unknown) => Promise<{ data: { data: { id: string; updatedAt?: string | null } } }>
    patch: (url: string, payload: unknown) => Promise<unknown>
    get: (url: string) => Promise<{ data: { data: { updatedAt?: string | null } } }>
  }
}

export const useSalesOrderEntry = ({
  orders,
  customers,
  historyProducts,
  pricelistProducts,
  incomingDraft,
  posting,
  setPosting,
  refreshOrders,
  submitForCustomer,
  api,
}: UseSalesOrderEntryOptions) => {
  const navigate = useNavigate()
  const location = useLocation()
  const resumedDraftRef = useRef<string | null>(null)
  const productSearchRef = useRef<HTMLInputElement | null>(null)

  const [step, setStep] = useState<'customer' | 'product' | 'confirm'>('customer')
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftVersion, setActiveDraftVersion] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [historyPage, setHistoryPage] = useState(1)
  const [pricelistPage, setPricelistPage] = useState(1)
  const [lines, setLines] = useState<OrderLine[]>([])
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1)
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false)
  const [cartDialogProduct, setCartDialogProduct] = useState<Product | null>(null)
  const [cartOpenRequest, setCartOpenRequest] = useState(0)
  const [productTab, setProductTab] = useState<'actual' | 'pricelist'>('actual')

  const customerId = selectedCustomer?.id != null ? String(selectedCustomer.id) : null

  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer)
    setActiveDraftId(null)
    setActiveDraftVersion(null)
    setNotes('')
    setSearch('')
    setProductSearch('')
    setHistoryPage(1)
    setPricelistPage(1)
    setLines([])
    setActiveCustomerIndex(-1)
    setCustomerSuggestionsOpen(false)
    setStep('product')
  }

  const onCustomerSearch = (value: string) => setSearch(value)

  const openProductCart = (product: Product) => {
    setCartDialogProduct(product)
    setCartOpenRequest((current) => current + 1)
    setProductSuggestionsOpen(false)
    setActiveSuggestionIndex(-1)
  }

  const onProductSearch = (value: string) => {
    setProductSearch(value)
    setActiveSuggestionIndex(-1)
    setProductSuggestionsOpen(Boolean(value.trim()))
    setHistoryPage(1)
    setPricelistPage(1)
  }

  const allDrafts = useMemo(
    () => orders
      .filter((o) => o.kind === 'order' && o.status === 'draft')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  )

  const resumeDraft = useCallback((draft: Order): boolean => {
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

    const cachedCustomer = customers.find((item) => String(item.id) === String(draftCustomerId))
    const embeddedCustomer = details.customer
    const customer: SelectedCustomer = cachedCustomer ?? {
      ...embeddedCustomer,
      id: draftCustomerId as Customer['id'],
      CardName: embeddedCustomer?.CardName ?? draft.company ?? draft.userName ?? 'Customer',
      CardCode: embeddedCustomer?.CardCode ?? details.CardCode ?? details.cardCode ?? '',
    }

    const draftLines = (draft.items ?? []).flatMap((item) => {
      if (!item.product?.id) return []
      return [{
        product: {
          ...item.product,
          id: Number(item.product.id),
          price: item.price ?? item.product.price ?? null,
          currency: item.currency ?? item.product.currency ?? null,
          priceSource: item.priceSource ?? item.product.priceSource ?? null,
        } as Product,
        qty: Math.max(1, item.qty ?? 1),
      }]
    })

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
  }, [customers])

  useEffect(() => {
    if (!incomingDraft || resumedDraftRef.current === incomingDraft.id) return
    if (!resumeDraft(incomingDraft)) return
    resumedDraftRef.current = incomingDraft.id
    navigate(location.pathname, { replace: true, state: null })
  }, [incomingDraft, location.pathname, navigate, resumeDraft])

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
      if (!activeDraftId) setActiveDraftId((response as { data: { data: { id: string } } }).data.data.id)
      await refreshOrders()
      const latest = activeDraftId ? await api.get(`/requests/${activeDraftId}`) : response
      setActiveDraftVersion((latest as { data: { data: { updatedAt?: string | null } } }).data.data.updatedAt ?? null)
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

  const addLine = (product: Product, qty = 1) => {
    setLines((previous) => {
      const existing = previous.find((line) => String(line.product.id) === String(product.id))
      if (existing) {
        return previous.map((line) =>
          String(line.product.id) === String(product.id)
            ? { product, qty: line.qty + qty }
            : line,
        )
      }
      return [...previous, { product, qty }]
    })
  }

  const setLineQty = (productId: string, qty: number) => {
    setLines((previous) => {
      const exists = previous.some((line) => String(line.product.id) === productId)
      if (exists) {
        return previous.map((line) =>
          String(line.product.id) === productId ? { ...line, qty: Math.max(1, qty) } : line,
        )
      }
      const product = [...historyProducts, ...pricelistProducts].find(
        (item) => String(item.id) === productId,
      )
      if (!product) return previous
      return [...previous, { product, qty: Math.max(1, qty) }]
    })
  }

  const removeLine = (productId: string) => {
    setLines((previous) => previous.filter((line) => String(line.product.id) !== productId))
    if (step === 'confirm' && lines.length === 1) setStep('product')
  }

  const { total, totalQty } = useMemo(
    () => lines.reduce(
      (result, line) => ({
        total: result.total + Number(line.product.price ?? 0) * line.qty,
        totalQty: result.totalQty + line.qty,
      }),
      { total: 0, totalQty: 0 },
    ),
    [lines],
  )

  const resetProductSearch = () => {
    onProductSearch('')
    requestAnimationFrame(() => productSearchRef.current?.focus())
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

  return {
    step, setStep, selectedCustomer, setSelectedCustomer, customerId,
    activeDraftId, setActiveDraftId, activeDraftVersion, setActiveDraftVersion,
    notes, setNotes, search, setSearch, productSearch, setProductSearch,
    historyPage, setHistoryPage, pricelistPage, setPricelistPage,
    lines, setLines, activeCustomerIndex, setActiveCustomerIndex,
    customerSuggestionsOpen, setCustomerSuggestionsOpen,
    activeSuggestionIndex, setActiveSuggestionIndex,
    productSuggestionsOpen, setProductSuggestionsOpen,
    cartDialogProduct, setCartDialogProduct, cartOpenRequest, setCartOpenRequest,
    productTab, setProductTab, productSearchRef, allDrafts,
    selectCustomer, onCustomerSearch, openProductCart, onProductSearch,
    resumeDraft, saveDraft, cancelDraft, addLine, setLineQty, removeLine,
    total, totalQty, resetProductSearch, submit,
  }
}
