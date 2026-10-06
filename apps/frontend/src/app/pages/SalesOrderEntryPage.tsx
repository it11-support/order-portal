import { useEffect, useMemo, useState } from 'react'
import { Search, Send, Trash2 } from 'lucide-react'
import { Shell } from '@layouts'
import { api } from '@lib'
import { useOrders } from '@contexts'
import type { Customer, Product } from '@repo/shared'
import { toast } from 'sonner'

/**
 * Sales enters an order on behalf of one of their customers.
 *
 * The customer list arrives already scoped to the sales person's book by the
 * API, and the same scope is re-checked on submit, so this page cannot be used
 * to reach another territory. Lines are priced server-side from that customer's
 * own prices, so what sales sees is what the customer will be charged.
 */
const SalesOrderEntryPage = () => {
  const { submitForCustomer } = useOrders()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerId, setCustomerId] = useState('')
  const [productSearch, setProductSearch] = useState('')
  const [debouncedProduct, setDebouncedProduct] = useState('')
  const [products, setProducts] = useState<Product[]>([])
  const [lines, setLines] = useState<Array<{ product: Product; qty: number }>>([])
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [posting, setPosting] = useState(false)

  const selectedCustomer = useMemo(
    () => customers.find((customer) => String(customer.id) === customerId) ?? null,
    [customers, customerId],
  )

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
    setLines((previous) => previous.filter((line) => String(line.product.id) !== productId))
  }

  const total = lines.reduce(
    (sum, line) => sum + (line.product.price ?? 0) * line.qty,
    0,
  )

  const formatIDR = (value: number, currency: string | null) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency || 'IDR',
      maximumFractionDigits: 2,
    }).format(value)

  const submit = async () => {
    if (!customerId || !lines.length) return
    setPosting(true)
    try {
      const created = await toast.promise(
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
      setLines([])
      setNotes('')
      setSearch('')
      setDebounced('')
    } finally {
      setPosting(false)
    }
  }

  return (
    <Shell
      title="Input Order Customer"
      showBack={false}
      actionBar={
        <div className="flex justify-center">
          <button
            type="button"
            onClick={submit}
            disabled={posting || !customerId || !lines.length}
            className="flex items-center gap-2 bg-accent text-white px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-accent/90 disabled:opacity-50 transition-all"
          >
            <Send size={16} />
            {posting ? 'Mengirim...' : 'Simpan Order'}
          </button>
        </div>
      }
    >
      <div className="max-w-3xl space-y-4">
        <p className="rounded-xl bg-secondary p-3 text-xs text-muted-foreground">
          Order yang dibuat di sini masuk ke daftar order customer dengan status menunggu
          konfirmasi, dan customer menerima notifikasi. Harga dihitung dari harga aktual
          customer untuk produk yang pernah dibeli, price list untuk produk baru.
        </p>

        {/* Customer */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            1. Pilih customer
          </p>
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              value={search}
              onChange={(e) => onCustomerSearch(e.target.value)}
              placeholder="Cari nama atau CardCode customer..."
              className="w-full rounded-xl border border-border bg-input-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="max-h-56 overflow-y-auto divide-y divide-border rounded-xl border border-border">
            {loading && <p className="p-3 text-sm text-muted-foreground">Memuat customer...</p>}
            {!loading && customers.length === 0 && (
              <p className="p-3 text-sm text-muted-foreground">Ketik untuk mencari customer.</p>
            )}
            {customers.map((customer) => (
              <button
                key={String(customer.id)}
                type="button"
                onClick={() => {
                  setCustomerId(String(customer.id))
                  setLines([])
                }}
                className={`w-full text-left px-3 py-2.5 hover:bg-secondary ${
                  customerId === String(customer.id) ? 'bg-accent/10' : ''
                }`}
              >
                <p className="text-sm font-semibold">{customer.CardName}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {customer.CardCode} · {customer.SalesName ?? 'Tanpa sales'}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="bg-white rounded-2xl border border-border p-4 space-y-3">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            2. Tambah produk
          </p>
          {!selectedCustomer ? (
            <p className="text-sm text-muted-foreground">Pilih customer terlebih dahulu.</p>
          ) : (
            <>
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  value={productSearch}
                  onChange={(e) => onProductSearch(e.target.value)}
                  placeholder="Cari nama atau kode produk..."
                  className="w-full rounded-xl border border-border bg-input-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-border rounded-xl border border-border">
                {products.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">Ketik untuk mencari produk.</p>
                )}
                {products.map((product) => (
                  <button
                    key={String(product.id)}
                    type="button"
                    onClick={() => addLine(product)}
                    className="w-full text-left px-3 py-2.5 hover:bg-secondary"
                  >
                    <p className="text-sm font-semibold">{product.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-mono">{product.itemCode}</span>
                      {typeof product.price === 'number' && (
                        <span className="ml-2 font-semibold text-foreground">
                          {formatIDR(product.price, product.currency ?? null)}
                          <span className="ml-1 font-normal text-muted-foreground">
                            {product.priceSource === 'actual' ? 'harga aktual' : 'price list'}
                          </span>
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Lines */}
        {lines.length > 0 && (
          <div className="bg-white rounded-2xl border border-border p-4 space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              3. Pesanan
            </p>
            {lines.map((line) => (
              <div key={String(line.product.id)} className="flex items-center gap-3 py-1.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{line.product.itemName}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeof line.product.price === 'number'
                      ? formatIDR(line.product.price, line.product.currency ?? null)
                      : 'Harga upon request'}
                  </p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => setLineQty(String(line.product.id), Number(e.target.value))}
                  className="w-20 rounded-xl border border-border bg-input-background px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  aria-label={`Hapus ${line.product.itemName}`}
                  onClick={() => removeLine(String(line.product.id))}
                  className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">{formatIDR(total, lines[0]?.product.currency ?? null)}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-border p-4">
          <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
            Catatan untuk customer
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Contoh: pesanan rutin, kirim setiap Senin..."
            className="w-full bg-input-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent resize-none"
          />
        </div>
      </div>
    </Shell>
  )
}

export default SalesOrderEntryPage