import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Send } from 'lucide-react'
import { Shell } from '@layouts'
import { api, swrFetcher } from '@lib'
import { useOrders } from '@contexts'
import type { Customer, Order, Product } from '@repo/shared'
import { toast } from 'sonner'
import { useDebounce } from '@/app/hooks'
import useSWR from 'swr'
import ReviewOrder from './ReviewOrder'
import ProductSelection from './ProductSelection'
import CustomerSelection from './CustomerSelection'
import { OrderDraft } from './OrderDraft'
import Stepper from './Stepper'

type CustomerResponse = {
  data: Customer[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type ProductResponse = {
  data: Product[]
  meta: {
    current_page: number
    total_pages: number
    total_records: number
    limit: number
  }
}

/**
 * Sales enters an order on behalf of one of their customers.
 *
 * The customer list arrives already scoped to the sales person's book by the
 * API, and the same scope is re-checked on submit, so this page cannot be used
 * to reach another territory. Lines are priced server-side from that customer's
 * own prices, so what sales sees is what the customer will be charged.
 */

type SelectedCustomer = Pick<Customer, 'id' | 'CardName'> & Partial<Customer>

type DraftCustomerFields = {
  customer?: Partial<Customer> | null
  customerId?: string | number | null
  CardCode?: string | null
  cardCode?: string | null
}

const SalesOrderEntryPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const resumedDraftRef = useRef<string | null>(null)
  const incomingDraft = (location.state as { resumeDraft?: Order } | null)?.resumeDraft
  const { submitForCustomer, orders, refreshOrders } = useOrders()
  const [step, setStep] = useState<'customer' | 'product' | 'confirm'>('customer')
  const [search, setSearch] = useState('')

  const [productSearch, setProductSearch] = useState('')
  const [productSuggestionsOpen, setProductSuggestionsOpen] = useState(false)
  const [cartDialogProduct, setCartDialogProduct] = useState<Product | null>(null)
  const [cartOpenRequest, setCartOpenRequest] = useState(0)
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1)
  const suggestionRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [productTab, setProductTab] = useState<'actual' | 'pricelist'>('actual')
  const [historyPage, setHistoryPage] = useState(1)
  const [pricelistPage, setPricelistPage] = useState(1)
  const [lines, setLines] = useState<Array<{ product: Product; qty: number }>>([])
  const [notes, setNotes] = useState('')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftVersion, setActiveDraftVersion] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null)
  const customerId = selectedCustomer ? String(selectedCustomer.id) : ''
  const debouncedSearch = useDebounce(search.trim(), 300)
  const debouncedProductSearch = useDebounce(productSearch.trim(), 300)
  const searchingProducts = debouncedProductSearch.length > 0

  const productSearchRef = useRef<HTMLInputElement | null>(null)

  const customerSearchRef = useRef<HTMLInputElement>(null)
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(-1)
  const [customerSuggestionsOpen, setCustomerSuggestionsOpen] = useState(false)
  const customerOptionRefs = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (step !== 'customer') return
    customerSearchRef.current?.focus()
  }, [step])

  useEffect(() => {
    setActiveCustomerIndex(-1)
  }, [debouncedSearch])

  useEffect(() => {
    if (step !== 'customer' || activeCustomerIndex < 0) return
    if (customerSuggestionsOpen)
      customerOptionRefs.current[activeCustomerIndex]?.scrollIntoView({ block: 'nearest' })
  }, [activeCustomerIndex, step, customerSuggestionsOpen])

  const {
    data: customerData,
    isLoading: customersLoading,
    isValidating: customersValidating,
  } = useSWR<CustomerResponse>(
    step === 'customer'
      ? `/customers?page=1&limit=100&search=${encodeURIComponent(debouncedSearch)}&showInactive=false`
      : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
    },
  )

  const customers = customerData?.data ?? []
  const customerResultsReady =
    !customersLoading && !customersValidating && debouncedSearch === search.trim()
  const customerSuggestions = customers.slice(0, 10)

  const productUrl =
    customerId && step === 'product'
      ? `/categories/products?customerId=${encodeURIComponent(customerId)}&pageSize=20&search=${encodeURIComponent(debouncedProductSearch)}`
      : null

  // History Pembelian
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyError,
  } = useSWR<ProductResponse>(
    productUrl ? `${productUrl}&priceSource=actual&page=${historyPage}` : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
    },
  )

  // Produk Lainnya
  const {
    data: pricelistData,
    isLoading: pricelistLoading,
    error: pricelistError,
  } = useSWR<ProductResponse>(
    productUrl ? `${productUrl}&priceSource=pricelist&page=${pricelistPage}` : null,
    swrFetcher,
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
    },
  )

  // Data produk
  const historyProducts = useMemo(
    () =>
      [...(historyData?.data ?? [])].sort((a, b) => {
        const dateA = a.lastInvoiceDate ? new Date(a.lastInvoiceDate).getTime() : 0
        const dateB = b.lastInvoiceDate ? new Date(b.lastInvoiceDate).getTime() : 0

        return dateB - dateA
      }),
    [historyData?.data],
  )
  const pricelistProducts = pricelistData?.data ?? []

  const productSuggestions = useMemo(
    () =>
      [
        ...historyProducts.map((product) => ({ product, source: 'History Pembelian' })),
        ...pricelistProducts.map((product) => ({ product, source: 'Produk Lainnya' })),
      ].slice(0, 10),
    [historyProducts, pricelistProducts],
  )
  const suggestionsLoading = historyLoading || pricelistLoading

  useEffect(() => {
    setActiveSuggestionIndex(-1)
  }, [debouncedProductSearch, historyPage, pricelistPage])

  useEffect(() => {
    if (activeSuggestionIndex >= 0) {
      suggestionRefs.current[activeSuggestionIndex]?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeSuggestionIndex])

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

  // Metadata pagination
  const historyMeta = historyData?.meta
  const pricelistMeta = pricelistData?.meta

  const onCustomerSearch = (value: string) => {
    setSearch(value)
  }
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

    const draftLines = (draft.items ?? []).flatMap((item) => {
      if (!item.product?.id) return []
      return [
        {
          product: {
            ...item.product,
            id: Number(item.product.id),
            price: item.price ?? item.product.price ?? null,
            currency: item.currency ?? item.product.currency ?? null,
            priceSource: item.priceSource ?? item.product.priceSource ?? null,
          } as Product,
          qty: Math.max(1, item.qty ?? 1),
        },
      ]
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

  const addLine = (product: Product, qty = 1) => {
    setLines((previous) => {
      const existing = previous.find((line) => String(line.product.id) === String(product.id))

      if (existing) {
        return previous.map((line) =>
          String(line.product.id) === String(product.id)
            ? {
                product,
                qty: line.qty + qty,
              }
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
    () =>
      lines.reduce(
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
    requestAnimationFrame(() => {
      productSearchRef.current?.focus()
    })
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

  return (
    <Shell
      title="Input Order Customer"
      showBack={false}
      actionBar={
        step === 'confirm' ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={submit}
              disabled={posting || !customerId || !lines.length}
              className="flex items-center gap-2 bg-accent text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
            >
              <Send size={12} />
              {posting ? 'Mengirim...' : 'Kirim Order'}
            </button>
          </div>
        ) : null
      }
    >
      <div className="max-w-3xl space-y-4">
        <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          Order yang dibuat di sini masuk ke daftar order customer dengan status menunggu
          konfirmasi, dan customer menerima notifikasi. Harga dihitung dari harga aktual customer
          untuk produk yang pernah dibeli, price list untuk produk baru.
        </p>

        {/* Enterprise order progress */}
        <nav
          aria-label="Tahapan order"
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          {/* Stepper */}
          <Stepper step={step} />
        </nav>

        {step === 'customer' && (
          <OrderDraft
            drafts={allDrafts}
            onResume={resumeDraft}
            onCancel={cancelDraft}
            disabled={posting}
          />
        )}

        {/* Step 1: Customer - Enterprise directory */}
        {step === 'customer' && (
          <CustomerSelection
            search={search}
            onCustomerSearch={onCustomerSearch}
            customerSuggestionsOpen={customerSuggestionsOpen}
            setCustomerSuggestionsOpen={setCustomerSuggestionsOpen}
            activeCustomerIndex={activeCustomerIndex}
            setActiveCustomerIndex={setActiveCustomerIndex}
            customerResultsReady={customerResultsReady}
            customerSuggestions={customerSuggestions}
            customers={customers}
            selectCustomer={selectCustomer}
          />
        )}
        {/* Step 2: Product - Enterprise workspace */}
        {step === 'product' && selectedCustomer && (
          <ProductSelection
            selectedCustomer={selectedCustomer}
            activeDraftId={activeDraftId}
            onBack={() => setStep('customer')}
            onCancelDraft={cancelDraft}
            posting={posting}
            lines={lines}
            onSaveDraft={saveDraft}
            totalQty={totalQty}
            total={total}
            onRemoveLine={removeLine}
            onSetLineQty={setLineQty}
            onConfirm={() => setStep('confirm')}
            addLine={addLine}
            resetProductSearch={resetProductSearch}

            productSearchRef={(element) => {
              productSearchRef.current = element
            }}
            productSearch={productSearch}
            onProductSearch={onProductSearch}
            productSuggestionsOpen={productSuggestionsOpen}
            setProductSuggestionsOpen={setProductSuggestionsOpen}
            activeSuggestionIndex={activeSuggestionIndex}
            setActiveSuggestionIndex={setActiveSuggestionIndex}
            suggestionsLoading={suggestionsLoading}
            productSuggestions={productSuggestions}
            suggestionRefs={suggestionRefs}
            openProductCart={openProductCart}
            searchingProducts={searchingProducts}

            // Autocomplete cart
            cartDialogProduct={cartDialogProduct}
            setCartDialogProduct={setCartDialogProduct}
            cartOpenRequest={cartOpenRequest}

            // Product tabs
            productTab={productTab}
            setProductTab={setProductTab}

            // History Pembelian
            historyProducts={historyProducts}
            historyMeta={historyMeta}
            historyPage={historyPage}
            setHistoryPage={setHistoryPage}
            historyLoading={historyLoading}
            historyError={historyError}

            // Produk Lainnya
            pricelistProducts={pricelistProducts}
            pricelistMeta={pricelistMeta}
            pricelistPage={pricelistPage}
            setPricelistPage={setPricelistPage}
            pricelistLoading={pricelistLoading}
            pricelistError={pricelistError}
          />
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && lines.length > 0 && (
          <ReviewOrder
            selectedCustomer={selectedCustomer}
            lines={lines}
            totalQty={totalQty}
            total={total}
            notes={notes}
            posting={posting}
            activeDraftId={activeDraftId}
            onBack={() => setStep('product')}
            onCancelDraft={cancelDraft}
            onSaveDraft={saveDraft}
            onRemoveLine={removeLine}
            onSetLineQty={setLineQty}
            onNotesChange={setNotes}
          />
        )}
      </div>
    </Shell>
  )
}

export default SalesOrderEntryPage
