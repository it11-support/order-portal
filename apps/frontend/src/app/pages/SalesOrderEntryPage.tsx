import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Minus,
  Plus,
  Search,
  Send,
  ShoppingCart,
  Trash2,
  X,
  Building2,
  Package2,
  ClipboardList,
  CheckCircle2,
  Users,
  ChevronRight,
  Check,
} from 'lucide-react'
import { Shell } from '@layouts'
import { Loader, QtyControl } from '@components'
import { api } from '@lib'
import { useOrders } from '@contexts'
import type { Customer, Order, Product } from '@repo/shared'
import { toast } from 'sonner'
import { formatRupiah } from '@/lib/formatCurrency'

/**
 * Sales enters an order on behalf of one of their customers.
 *
 * The customer list arrives already scoped to the sales person's book by the
 * API, and the same scope is re-checked on submit, so this page cannot be used
 * to reach another territory. Lines are priced server-side from that customer's
 * own prices, so what sales sees is what the customer will be charged.
 */
const SalesOrderEntryPage = () => {
  const { submitForCustomer, orders, refreshOrders } = useOrders()
  const [step, setStep] = useState<'customer' | 'product' | 'confirm'>('customer')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProduct, setDebouncedProduct] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<Array<{ product: Product; qty: number }>>([])
  const [notes, setNotes] = useState('')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)
  const [activeDraftVersion, setActiveDraftVersion] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Order[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === customerId) ?? null,
    [customers, customerId],
  )

  const STEPS = ['Pilih customer', 'Pilih produk', 'Konfirmasi & kirim'] as const
  const stepOrder = ['customer', 'product', 'confirm'] as const
  const stepIndex = stepOrder.indexOf(step)

  // Search boxes are debounced so typing does not hammer the API on every key.
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true)
      api
        .get(
          `/customers?page=1&limit=100&search=${encodeURIComponent(debounced.trim())}&showInactive=false`,
        )
        .then((response) => setCustomers((response.data.data ?? []) as Customer[]))
        .catch(() => setCustomers([]))
        .finally(() => setLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [debounced])

  useEffect(() => {
    if (!customerId) {
      setProducts([])
      return
    }
    const timer = setTimeout(() => {
      api
        .get(
          `/categories/products?page=1&pageSize=20&search=${encodeURIComponent(
            debouncedProduct.trim(),
          )}&customerId=${customerId}`,
        )
        .then((response) => setProducts((response.data.data ?? []) as Product[]))
        .catch(() => setProducts([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [debouncedProduct, customerId])

  const onCustomerSearch = (value: string) => {
    setSearch(value)
    setDebounced(value)
  }

  const onProductSearch = (value: string) => {
    setProductSearch(value)
    setDebouncedProduct(value)
  }

  // Drafts for the selected customer are already loaded by OrderContext
  // (scoped to the sales person's territory). Filter locally.
  const customerDrafts = useMemo(
    () =>
      orders
        .filter(
          (o) => o.kind === 'order' && o.status === 'draft' && String(o.userId) === customerId,
        )
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders, customerId],
  )

  const allDrafts = useMemo(
    () =>
      orders
        .filter((o) => o.kind === 'order' && o.status === 'draft')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [orders],
  )

  const resumeDraft = async (draft: Order) => {
    setCustomerId(String(draft.userId))
    setNotes(draft.notes ?? '')
    setActiveDraftId(draft.id)
    setActiveDraftVersion((draft as Order & { updatedAt?: string }).updatedAt ?? null)

    const draftLines = (draft.items ?? []).map((item) => ({
      product: {
        ...item.product,
        id: Number(item.product.id),
        price: item.price ?? item.product.price ?? null,
        currency: item.currency ?? item.product.currency ?? null,
        priceSource: item.priceSource ?? item.product.priceSource ?? null,
      } as Product,
      qty: item.qty ?? 1,
    }))

    setLines(draftLines)
    setStep('product')
  }

  const saveDraft = async () => {
    if (!customerId || !lines.length) return
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

  const submitDraft = async (id: string) => {
    setPosting(true)
    try {
      await api.patch(`/requests/${id}`, { status: 'pending' })
      await refreshOrders()
      if (activeDraftId === id) {
        setActiveDraftId(null)
        setActiveDraftVersion(null)
        setLines([])
        setNotes('')
      }
      toast.success('Draft dikirim sebagai pesanan')
    } catch {
      toast.error('Gagal mengirim draft')
    } finally {
      setPosting(false)
    }
  }

  const deleteEmptyDraft = async (id: string) => {
    try {
      await api.patch(`/requests/${id}`, {
        status: 'cancelled',
      })

      setActiveDraftId(null)
      setActiveDraftVersion(null)
      setLines([])
      setNotes('')

      await refreshOrders()
      toast.success('Draft kosong telah dihapus')
    } catch {
      toast.error('Gagal menghapus draft kosong')
    }
  }

  const cancelDraft = async (id: string) => {
    setPosting(true)
    try {
      await api.patch(`/requests/${id}`, { status: 'cancelled' })
      await refreshOrders()
      if (activeDraftId === id) {
        setActiveDraftId(null)
        setActiveDraftVersion(null)
        setLines([])
        setNotes('')
      }
      toast.success('Draft dihapus')
    } catch {
      toast.error('Gagal menghapus draft')
    } finally {
      setPosting(false)
    }
  }

  const addLine = (product: Product) => {
    setLines((previous) =>
      previous.some((line) => String(line.product.id) === String(product.id))
        ? previous
        : [...previous, { product, qty: 1 }],
    )
  }

  const setLineQty = (productId: string, qty: number) => {
    setLines((previous) =>
      previous.map((line) =>
        String(line.product.id) === productId ? { ...line, qty: Math.max(1, qty) } : line,
      ),
    )
  }

  const removeLine = (productId: string) => {
    const remaining = lines.filter((line) => String(line.product.id) !== productId)

    setLines(remaining)

    if (remaining.length === 0) {
      if (activeDraftId) {
        void deleteEmptyDraft(activeDraftId)
      }

      if (step === 'confirm') {
        setStep('product')
      }
    }
  }

  const total = lines.reduce((sum, line) => sum + (line.product.price ?? 0) * line.qty, 0)

  const submit = async () => {
    if (!customerId || !lines.length) return
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
      setDebounced('')
      setCustomerId('')
      setStep('customer')
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
            <div className="max-h-[430px] overflow-y-auto">
              {loading && <Loader label="Memuat customer..." className="p-4" />}
              {!loading && customers.length === 0 && (
                <div className="px-4 py-10 text-center">
                  <Users size={25} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-medium text-slate-600">Tidak ada customer ditemukan</p>
                  <p className="mt-1 text-xs text-slate-400">Coba nama atau kode yang berbeda.</p>
                </div>
              )}
              {!loading &&
                customers.map((customer) => (
                  <button
                    key={String(customer.id)}
                    type="button"
                    onClick={() => {
                      setCustomerId(String(customer.id))
                      setLines([])
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
                <button
                  type="button"
                  onClick={() => setStep('customer')}
                  className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Ganti
                </button>
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
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Daftar Produk · Harga Customer
              </div>
              <div className="max-h-[430px] overflow-y-auto">
                {products.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-slate-500">
                    Tidak ada produk yang ditemukan.
                  </div>
                )}
                {products.map((product) => {
                  const existing = lines.find(
                    (line) => String(line.product.id) === String(product.id),
                  )
                  return (
                    <div
                      key={String(product.id)}
                      className={`border-t border-slate-200 px-4 py-3 first:border-t-0 ${
                        existing ? 'bg-blue-50/40' : 'bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold leading-snug text-slate-900">
                            {product.itemName}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-slate-500">
                            {product.itemCode}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold tabular-nums text-slate-900">
                              {typeof product.price === 'number'
                                ? formatRupiah(product.price)
                                : 'Harga belum tersedia'}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                product.priceSource === 'actual'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {product.priceSource === 'actual' ? 'Harga aktual' : 'Price list'}
                            </span>
                          </div>
                        </div>
                        {existing && (
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600" />
                        )}
                      </div>
                      <div className="mt-3 flex min-h-9 items-center justify-between border-t border-slate-200 pt-2.5">
                        <span className="text-[11px] font-medium text-slate-500">
                          {existing ? `${existing.qty} dalam pesanan` : 'Jumlah pesanan'}
                        </span>
                        <QtyControl
                          product={product}
                          qty={existing?.qty ?? 0}
                          onQtyChange={(id, qty) => setLineQty(String(id), Math.max(1, qty))}
                          onIncrease={(p) => {
                            const line = lines.find((l) => String(l.product.id) === String(p.id))
                            setLineQty(String(p.id), (line?.qty ?? 0) + 1)
                          }}
                          onDecrease={(p) => {
                            const line = lines.find((l) => String(l.product.id) === String(p.id))
                            const next = (line?.qty ?? 1) - 1
                            if (next <= 0) removeLine(String(p.id))
                            else setLineQty(String(p.id), next)
                          }}
                          onRemove={(id) => removeLine(String(id))}
                          onAdd={(p) => addLine(p)}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Selected lines / order summary */}
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <ClipboardList size={17} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Ringkasan Pesanan</h3>
                    <p className="text-[11px] text-slate-500">Item yang akan diajukan</p>
                  </div>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold tabular-nums text-slate-700">
                  {lines.length} item
                </span>
              </div>
              {lines.length === 0 ? (
                <div className="flex flex-col items-center px-4 py-9 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
                    <ShoppingCart size={22} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Pesanan masih kosong</p>
                  <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                    Tambahkan produk dari katalog untuk menyusun pesanan customer.
                  </p>
                </div>
              ) : (
                <>
                  <div className="max-h-[360px] divide-y divide-slate-200 overflow-y-auto">
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
                      <span className="font-semibold tabular-nums">
                        {lines.reduce((sum, line) => sum + line.qty, 0)}
                      </span>
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
                </>
              )}
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
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    {lines.reduce((sum, line) => sum + line.qty, 0)} unit
                  </p>
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
