import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  Building2,
  Package2,
  ClipboardList,
  CheckCircle2,
  Users,
  ChevronRight,
  Check,
  ChevronDown,
} from 'lucide-react'
import { Shell } from '@layouts'
import { Loader, QtyControl } from '@components'
import { api, swrFetcher } from '@lib'
import { useOrders } from '@contexts'
import type { Customer, Order, Product } from '@repo/shared'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatCurrency'
import { useDebounce } from '@/app/hooks'
import useSWR from 'swr'

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

  const STEPS = ['Pilih customer', 'Pilih produk', 'Konfirmasi & kirim'] as const
  const stepOrder = ['customer', 'product', 'confirm'] as const
  const stepIndex = stepOrder.indexOf(step)
  const [summaryExpanded, setSummaryExpanded] = useState(false)

  const { data: customerData, isLoading: customersLoading } = useSWR<CustomerResponse>(
    step === 'customer'
      ? `/customers?page=1&limit=100&search=${encodeURIComponent(debouncedSearch)}&showInactive=false`
      : null,
    swrFetcher,
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
    },
  )

  const customers = customerData?.data ?? []

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

  // Metadata pagination
  const historyMeta = historyData?.meta
  const pricelistMeta = pricelistData?.meta

  const onCustomerSearch = (value: string) => {
    setSearch(value)
  }

  const formatLastPurchaseDate = (date?: Date | string | null) => {
    if (!date) return null

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) return null

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(parsedDate)
  }

  const onProductSearch = (value: string) => {
    setProductSearch(value)
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
    setSummaryExpanded(false)
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
        setSummaryExpanded(false)
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
      setSummaryExpanded(false)
      setStep('customer')
    } catch {
      toast.error('Gagal mengirim order')
    } finally {
      setPosting(false)
    }
  }

  const renderProductRow = (product: Product) => {
    const existing = lines.find((line) => String(line.product.id) === String(product.id))

    return (
      <div
        key={String(product.id)}
        className={`border-b border-slate-100 px-4 py-3 last:border-b-0 ${
          existing ? 'bg-slate-50' : 'bg-white'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-snug text-slate-800">
              {product.itemName}
            </p>
            {product.lastInvoiceDate && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Terakhir dibeli: {formatLastPurchaseDate(product.lastInvoiceDate)}
              </p>
            )}
          </div>

          {existing && <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-sm font-bold tabular-nums text-slate-900">
            {typeof product.price === 'number'
              ? formatRupiah(product.price)
              : 'Harga belum tersedia'}
          </span>

          <QtyControl
            product={product}
            cardcode={selectedCustomer?.CardCode ?? undefined}
            listMode
            qty={existing?.qty ?? 0}
            onAdd={(pricedProduct, qty) => addLine(pricedProduct, qty ?? 1)}
            onQtyChange={(id, qty) => setLineQty(String(id), qty)}
            onIncrease={(p) => {
              const line = lines.find((l) => String(l.product.id) === String(p.id))

              if (!line) addLine(p)
              else setLineQty(String(p.id), line.qty + 1)
            }}
            onDecrease={(p) => {
              const line = lines.find((l) => String(l.product.id) === String(p.id))

              if (!line) return

              if (line.qty <= 1) removeLine(String(p.id))
              else setLineQty(String(p.id), line.qty - 1)
            }}
            onRemove={(id) => removeLine(String(id))}
          />
        </div>
      </div>
    )
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
          <div className="flex w-full items-center gap-2 py-2">
            {STEPS.map((label, i) => {
              const active = stepIndex === i
              const completed = stepIndex > i

              return (
                <div
                  key={label}
                  className={`flex min-w-0 items-center transition-all duration-200 ${
                    active ? 'flex-1' : 'shrink-0'
                  }`}
                >
                  <div
                    className={`flex h-11 min-w-0 items-center gap-2 rounded-xl transition-all duration-200 ${
                      active ? 'w-full  border-sky-200/70 bg-white px-2.5' : 'justify-center px-1'
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        active
                          ? 'bg-sky-600 text-white'
                          : completed
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {completed ? <Check size={16} strokeWidth={2.5} /> : i + 1}
                    </span>

                    {active && (
                      <span className="min-w-0 truncate text-[13px] font-semibold tracking-tight text-slate-800">
                        {label}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </nav>

        {step === 'customer' && allDrafts.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <ClipboardList size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Draft Tersimpan</h3>
                  <p className="text-[11px] text-slate-500">
                    Lanjutkan pesanan yang masih dikerjakan
                  </p>
                </div>
              </div>
            </div>
            <div className="divide-y divide-slate-100">
              {allDrafts.map((draft) => {
                const customerName = draft.company ?? draft.userName ?? 'Customer'
                return (
                  <div
                    key={draft.id}
                    className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-slate-900 truncate">
                        {customerName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 font-mono">
                        Draft #{draft.id} · {draft.items?.length ?? 0} item
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => resumeDraft(draft)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors"
                      >
                        Lanjutkan
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          cancelDraft(draft.id)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        aria-label="Hapus draft"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Step 1: Customer - Enterprise directory */}
        {step === 'customer' && (
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-700">
                  <Users size={18} />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Direktori Customer</h2>
                  <p className="text-[11px] text-slate-500">Pilih akun untuk membuat sales order</p>
                </div>
              </div>
            </header>

            <div className="border-b border-slate-200 p-3 sm:p-4">
              <label
                htmlFor="sales-customer-search"
                className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500"
              >
                Cari customer
              </label>
              <div className="relative">
                <Search
                  size={17}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  id="sales-customer-search"
                  value={search}
                  onChange={(e) => onCustomerSearch(e.target.value)}
                  placeholder="Nama perusahaan atau CardCode"
                  className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-sky-600 focus:ring-2 focus:ring-sky-100"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => onCustomerSearch('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Nama / Kode customer</span>
              <span>Pilih</span>
            </div>
            <div className="max-h-130 overflow-y-auto">
              {customersLoading && <Loader label="Memuat customer..." className="p-4" />}
              {!customersLoading && customers.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Users size={25} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Tidak ada customer ditemukan</p>
                  <p className="mt-1 text-xs text-slate-400">Coba nama atau kode yang berbeda.</p>
                </div>
              )}
              {!customersLoading &&
                customers.map((customer) => (
                  <button
                    key={String(customer.id)}
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(customer)
                      setActiveDraftId(null)
                      setActiveDraftVersion(null)
                      setNotes('')
                      setProductSearch('')
                      setHistoryPage(1)
                      setPricelistPage(1)
                      setLines([])
                      setSummaryExpanded(false)
                      setStep('product')
                    }}
                    className="group flex w-full items-center gap-3 border-b border-slate-200 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-sky-50 focus-visible:bg-sky-50 focus-visible:outline-none"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-600 group-hover:border-sky-200 group-hover:bg-white group-hover:text-sky-700">
                      <Building2 size={17} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-bold leading-snug text-slate-900">
                        {customer.CardName}
                      </span>
                      <span className="mt-1 block text-[11px] leading-relaxed text-slate-500">
                        <span className="font-mono font-semibold text-slate-600">
                          {customer.CardCode}
                        </span>
                        {customer.SalesName ? ` · ${customer.SalesName}` : ''}
                      </span>
                    </span>
                    <ChevronRight
                      size={17}
                      className="shrink-0 text-slate-400 group-hover:text-sky-700"
                    />
                  </button>
                ))}
            </div>
            <footer className="border-t border-slate-200 bg-slate-50 px-4 py-2.5 text-[11px] text-slate-500">
              Pilih customer untuk melanjutkan ke katalog produk.
            </footer>
          </section>
        )}
        {/* Step 2: Product - Enterprise workspace */}
        {step === 'product' && selectedCustomer && (
          <div className="space-y-3">
            {/* Active account context */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
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
                    <p className="mt-0.5 text-xs text-slate-500">
                      PIC: {selectedCustomer.CntctPrsn}
                    </p>
                  )}
                </div>
                {!activeDraftId && (
                  <button
                    type="button"
                    onClick={() => setStep('customer')}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Ganti
                  </button>
                )}
                {activeDraftId && (
                  <button
                    type="button"
                    onClick={() => cancelDraft(activeDraftId)}
                    disabled={posting}
                    className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 size={14} className="inline-block mr-1" />
                    Hapus Draft
                  </button>
                )}
                {lines.length > 0 && (
                  <button
                    type="button"
                    onClick={saveDraft}
                    disabled={posting}
                    className="shrink-0 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Simpan draft
                  </button>
                )}
              </div>
            </section>

            {/* Selected lines / order summary */}
            {lines.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((expanded) => !expanded)}
                  aria-expanded={summaryExpanded}
                  aria-controls="order-summary-content"
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                      <ClipboardList size={17} />
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Ringkasan Pesanan</h3>
                      <p className="text-[11px] text-slate-500">
                        {lines.length} produk · {totalQty} unit
                      </p>
                    </div>
                  </div>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold tabular-nums text-slate-900">
                      {formatRupiah(total)}
                    </span>
                    <ChevronDown
                      size={16}
                      className={`text-slate-500 transition-transform ${summaryExpanded ? 'rotate-180' : ''}`}
                    />
                  </span>
                </button>
                {summaryExpanded && (
                  <div id="order-summary-content" className="border-t border-slate-200">
                    <div className="max-h-90 divide-y divide-slate-200 overflow-y-auto">
                      {lines.map((line, index) => (
                        <div key={String(line.product.id)} className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 w-5 shrink-0 font-mono text-[11px] text-slate-400">
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-semibold leading-snug text-slate-900">
                                {line.product.itemName}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                {formatRupiah(Number(line.product.price ?? 0))} / unit
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeLine(String(line.product.id))}
                              aria-label={`Hapus ${line.product.itemName}`}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <div className="mt-3 flex items-center justify-between pl-8">
                            <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
                              <button
                                type="button"
                                aria-label={`Kurangi ${line.product.itemName}`}
                                onClick={() => {
                                  if (line.qty <= 1) removeLine(String(line.product.id))
                                  else setLineQty(String(line.product.id), line.qty - 1)
                                }}
                                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="flex h-8 min-w-9 items-center justify-center border-x border-slate-300 px-2 text-xs font-bold tabular-nums text-slate-900">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                aria-label={`Tambah ${line.product.itemName}`}
                                onClick={() => setLineQty(String(line.product.id), line.qty + 1)}
                                className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                              {formatRupiah(Number(line.product.price ?? 0) * line.qty)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-200 bg-slate-50 px-4 py-4">
                      <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>Total unit</span>
                        <span className="font-semibold tabular-nums">{totalQty}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-slate-800">Total pesanan</span>
                        <span className="text-lg font-extrabold tabular-nums tracking-tight text-slate-900">
                          {formatRupiah(total)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep('confirm')}
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                      >
                        Review & Konfirmasi <ArrowRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Product catalogue */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <Package2 size={17} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Katalog Produk</h3>
                    <p className="text-[11px] text-slate-500">Pilih item untuk pesanan customer</p>
                  </div>
                </div>
              </div>
              <div className="p-3 sm:p-4">
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={productSearch}
                    onChange={(e) => onProductSearch(e.target.value)}
                    placeholder="Cari nama atau kode produk"
                    className="h-11 w-full rounded-lg border border-slate-300 bg-slate-50 pl-10 pr-10 text-sm text-slate-900 outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => onProductSearch('')}
                      aria-label="Hapus pencarian"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              {!searchingProducts && (
                <div
                  role="tablist"
                  aria-label="Kelompok produk"
                  className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-3"
                >
                  {(
                    [
                      {
                        key: 'actual',
                        label: 'History Pembelian',
                        count: historyMeta?.total_records ?? 0,
                      },
                      {
                        key: 'pricelist',
                        label: 'Produk Lainnya',
                        count: pricelistMeta?.total_records ?? 0,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.key}
                      type="button"
                      role="tab"
                      aria-selected={productTab === tab.key}
                      onClick={() => setProductTab(tab.key)}
                      className={`rounded-lg border px-3 py-3 text-left transition-colors ${
                        productTab === tab.key
                          ? 'border-sky-500 bg-white text-sky-700 shadow-sm ring-1 ring-sky-500'
                          : 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-white'
                      }`}
                    >
                      <span className="block text-xs font-bold">{tab.label}</span>
                      <span className="mt-1 block text-[11px]">{tab.count} produk</span>
                    </button>
                  ))}
                </div>
              )}
              {searchingProducts && (
                <div className="border-t border-sky-100 bg-sky-50 px-4 py-2 text-xs text-sky-800">
                  Hasil pencarian dari History Pembelian dan Produk Lainnya
                </div>
              )}
              <div className="max-h-107.5 overflow-y-auto">
                {(
                  [
                    {
                      key: 'actual',
                      title: 'History Pembelian',
                      description: 'Produk yang pernah dibeli customer',
                      products: historyProducts,
                      meta: historyMeta,
                      page: historyPage,
                      setPage: setHistoryPage,
                      loading: historyLoading,
                      error: historyError,
                    },
                    {
                      key: 'pricelist',
                      title: 'Produk Lainnya',
                      description: 'Produk yang belum pernah dibeli customer',
                      products: pricelistProducts,
                      meta: pricelistMeta,
                      page: pricelistPage,
                      setPage: setPricelistPage,
                      loading: pricelistLoading,
                      error: pricelistError,
                    },
                  ] as const
                )
                  .filter((group) => searchingProducts || group.key === productTab)
                  .map((group) => (
                    <div key={group.key} className="border-t border-slate-200">
                      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 bg-slate-100 px-4 py-3">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800">{group.title}</h4>
                          <p className="text-[11px] text-slate-500">{group.description}</p>
                        </div>
                        <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                          {group.meta?.total_records ?? 0} produk
                        </span>
                      </div>
                      {group.loading ? (
                        <Loader label={`Memuat ${group.title.toLowerCase()}...`} className="p-4" />
                      ) : group.error ? (
                        <p className="px-4 py-6 text-sm text-red-600">Gagal memuat produk.</p>
                      ) : group.products.length === 0 ? (
                        <p className="px-4 py-6 text-sm text-slate-500">
                          Tidak ada produk ditemukan.
                        </p>
                      ) : (
                        group.products.map(renderProductRow)
                      )}
                      {!group.loading && !group.error && (group.meta?.total_pages ?? 0) > 1 && (
                        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3">
                          <button
                            type="button"
                            disabled={group.page <= 1}
                            onClick={() => group.setPage((page) => Math.max(1, page - 1))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
                          >
                            Sebelumnya
                          </button>
                          <span className="text-xs text-slate-600">
                            Halaman {group.page} / {group.meta?.total_pages ?? 1}
                          </span>
                          <button
                            type="button"
                            disabled={group.page >= (group.meta?.total_pages ?? 1)}
                            onClick={() => group.setPage((page) => page + 1)}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-40"
                          >
                            Berikutnya
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </section>
          </div>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && lines.length > 0 && (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Sales Order
                </p>
                <h2 className="mt-1 text-base font-bold tracking-tight text-slate-900">
                  Review Pesanan
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setStep('product')}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-sky-700 transition-colors hover:bg-sky-50"
              >
                <ArrowLeft size={14} />
                Ubah
              </button>
              {activeDraftId && (
                <button
                  type="button"
                  onClick={() => cancelDraft(activeDraftId)}
                  disabled={posting}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Hapus Draft
                </button>
              )}
              <button
                type="button"
                onClick={saveDraft}
                disabled={posting}
                className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-50 disabled:opacity-50"
              >
                Simpan draft
              </button>
            </div>

            {/* CUSTOMER */}
            <div className="border-b border-slate-100 px-4 py-3.5">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Customer
              </p>
              <p className="text-sm font-bold text-slate-900">{selectedCustomer?.CardName}</p>
              <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                {selectedCustomer?.CardCode}
              </p>
            </div>

            {/* ITEMS */}
            <div className="px-4 pt-4">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-700">Rincian Produk</h3>
                <span className="text-[11px] text-slate-400">{lines.length} produk</span>
              </div>

              <div className="divide-y divide-slate-100">
                {lines.map((line) => (
                  <div key={String(line.product.id)} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-semibold leading-snug text-slate-900">
                          {line.product.itemName}
                        </p>

                        <p className="mt-1 text-[11px] text-slate-500">
                          {typeof line.product.price === 'number'
                            ? formatRupiah(line.product.price)
                            : 'Harga belum tersedia'}
                          {' / unit'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeLine(String(line.product.id))}
                        aria-label={`Hapus ${line.product.itemName}`}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white">
                        <button
                          type="button"
                          aria-label="Kurangi quantity"
                          onClick={() => {
                            const next = line.qty - 1
                            if (next <= 0) {
                              removeLine(String(line.product.id))
                            } else {
                              setLineQty(String(line.product.id), next)
                            }
                          }}
                          className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-sky-700"
                        >
                          <Minus size={14} />
                        </button>

                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) =>
                            setLineQty(String(line.product.id), Number(e.target.value))
                          }
                          className="h-8 w-10 border-x border-slate-100 bg-transparent text-center text-xs font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />

                        <button
                          type="button"
                          aria-label="Tambah quantity"
                          onClick={() => setLineQty(String(line.product.id), line.qty + 1)}
                          className="flex h-8 w-8 items-center justify-center text-slate-500 hover:text-sky-700"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <p className="text-sm font-semibold tabular-nums text-slate-900">
                        {formatRupiah(Number(line.product.price ?? 0) * line.qty)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* TOTAL */}
            <div className="mx-4 mt-2 border-t border-slate-200 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Total Pesanan</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{totalQty} unit</p>
                </div>

                <p className="text-xl font-bold tracking-tight tabular-nums text-slate-900">
                  {formatRupiah(total)}
                </p>
              </div>
            </div>

            {/* NOTES */}
            <div className="border-t border-slate-100 px-4 py-4">
              <label
                htmlFor="order-notes"
                className="mb-2 block text-[11px] font-semibold text-slate-600"
              >
                Catatan untuk Customer
                <span className="ml-1 font-normal text-slate-400">(Opsional)</span>
              </label>

              <textarea
                id="order-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Tambahkan instruksi atau catatan pesanan..."
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </section>
        )}
      </div>
    </Shell>
  )
}

export default SalesOrderEntryPage
