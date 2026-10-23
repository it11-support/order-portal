import {
  Search,
  X,
  ChevronDown,
  ShoppingBag,
  PackageSearch,
  Save,
  Send,
  FileText,
  ChevronRight,
  Plus,
  MessageSquareText,
  Trash2,
} from 'lucide-react'

import { Shell } from '@layouts'

import { useNavigate } from 'react-router-dom'

import { ProductList, Loader } from '@components'

import { useAuth, useCart, useCategories, useCatalogProducts, useOrders } from '@contexts'

import CategoryIcon from '@/app/components/categories/CategoryIcon'

import { useEffect, useMemo, useRef, useState } from 'react'
import { api } from '@lib'
import { toast } from 'sonner'
import { useActiveDraft } from '../hooks/useActiveDraft'

// One cart line per product. Repeated lines from draft/cart state must not
// double the ordered quantity; keep the latest quantity for each product.
const uniqueCartLines = <T extends { product: { id: number | string }; qty?: number }>(
  lines: T[],
): T[] => {
  const byProduct = new Map<string, T>()
  for (const line of lines) {
    const id = String(line.product.id)
    byProduct.set(id, line)
  }
  return [...byProduct.values()]
}

const orderItems = (lines: Array<{ product: { id: number | string }; qty?: number }>) =>
  uniqueCartLines(lines)
    .filter((item) => Number(item.qty ?? 0) > 0)
    .map((item) => ({ productId: String(item.product.id), qty: Number(item.qty) }))

// Keep a temporary text value while editing, and commit only on blur/Enter.
// This allows replacing a quantity without the cart forcing an immediate "1".
const QuantityInput = ({
  quantity,
  name,
  onCommit,
}: {
  quantity: number
  name: string
  onCommit: (value: number) => void
}) => {
  const [draft, setDraft] = useState(String(quantity))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(String(quantity))
  }, [quantity, editing])

  const commit = () => {
    const value = Number(draft.trim())
    if (/^[0-9]+$/.test(draft.trim()) && Number.isSafeInteger(value) && value > 0) {
      if (value !== quantity) onCommit(value)
      setDraft(String(value))
    } else {
      setDraft(String(quantity))
    }
    setEditing(false)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      aria-label={`Jumlah ${name}`}
      onFocus={(event) => {
        setEditing(true)
        event.currentTarget.select()
      }}
      onChange={(event) => {
        if (/^[0-9]*$/.test(event.target.value)) setDraft(event.target.value)
      }}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
        if (event.key === 'Escape') {
          setDraft(String(quantity))
          event.currentTarget.blur()
        }
      }}
      className="w-10 h-8 rounded-md border border-border px-1 text-center text-xs focus:border-accent focus:outline-none"
    />
  )
}

const CatalogPage = () => {
  const { user: currentUser, isAdmin, isSalesAdmin, isCustomer } = useAuth()

  const navigate = useNavigate()

  const { cart, setCart } = useCart()
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftActionId, setDraftActionId] = useState<string | null>(null)
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null)
  const { editingDraftId, setEditingDraftId } = useActiveDraft()
  const cartBeforeEditing = useRef<typeof cart | null>(null)
  const catalogRef = useRef<HTMLElement | null>(null)
  const { orders, refreshOrders } = useOrders()

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

  // Lanjutkan memilih draft sebagai cart aktif (replace, bukan merge).
  // Draft ID hanya dipakai untuk PATCH saat cart aktif disimpan/dikirim.
  const continueDraft = (draft: (typeof savedDrafts)[number]) => {
    if (editingDraftId === draft.id) {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      return
    }
    if (
      editingDraftId &&
      !window.confirm('Ganti draft aktif? Perubahan yang belum disimpan akan hilang.')
    )
      return
    if (
      !editingDraftId &&
      cart.length > 0 &&
      !window.confirm(
        'Ganti isi keranjang aktif dengan item draft ini? Item yang belum disimpan akan hilang dari keranjang aktif.',
      )
    )
      return

    if (!editingDraftId) cartBeforeEditing.current = cart.map((item) => ({ ...item }))
    setCart(
      uniqueCartLines(
        (draft.items ?? []).map((item) => ({
          product: {
            ...item.product,
            id: Number(item.product.id),
            price: item.price ?? item.product.price ?? null,
            currency: item.currency ?? item.product.currency ?? null,
            priceSource: item.priceSource ?? item.product.priceSource ?? null,
          },
          qty: item.qty ?? 1,
        })),
      ),
    )
    setEditingDraftId(draft.id)
    setExpandedDraftId(null)
    toast.success('Draft dipilih sebagai keranjang aktif')
    requestAnimationFrame(() =>
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
    )
  }

  const exitDraftEdit = () => {
    setCart(cartBeforeEditing.current ?? [])
    cartBeforeEditing.current = null
    setEditingDraftId(null)
    setExpandedDraftId(null)
  }

  // QtyControl di katalog dapat menambah produk; normalisasi cart bila ada ID ganda.
  useEffect(() => {
    if (!isCustomer || cart.length < 2) return
    const unique = uniqueCartLines(cart)
    if (unique.length !== cart.length) setCart(unique)
  }, [cart, isCustomer, setCart])

  const saveEditedDraft = async (submit = false) => {
    if (!editingDraftId || savingDraft) return
    setSavingDraft(true)
    try {
      const id = editingDraftId
      if (orderItems(cart).length === 0) {
        await api.patch(`/requests/${id}`, { status: 'cancelled' })
        toast.success('Draft kosong dibatalkan')
      } else {
        const items = orderItems(cart)
        // Save the current selection first, then submit this SAME draft.
        await api.patch(`/requests/${id}`, { items })
        if (submit) {
          await api.patch(`/requests/${id}`, { status: 'pending' })
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
      await api.patch(`/requests/${id}`, { status: 'cancelled' })
      await refreshOrders()
      if (expandedDraftId === id) setExpandedDraftId(null)
      if (editingDraftId === id) exitDraftEdit()
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
    if (savingDraft || orderItems(cart).length === 0) return
    setSavingDraft(true)
    try {
      await api.post('/requests', {
        kind: 'order',
        status: 'draft',
        items: orderItems(cart),
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

  const { search, setSearch, error: categoriesError } = useCategories()

  const isNonCustomer = isAdmin || isSalesAdmin

  // A single catalog hook ensures only the active customer mode is requested.
  const [catalogMode, setCatalogMode] = useState<'history' | 'inquiry'>('history')
  const [inquiryItems, setInquiryItems] = useState<Array<{ productId: string; name: string }>>([])
  const [sendingInquiry, setSendingInquiry] = useState(false)
  const {
    products: catalogProducts,
    loading: catalogLoading,
    isFetching: catalogFetching,
    isReachingEnd: catalogReachingEnd,
    loadMore: loadMoreCatalog,
    total: catalogTotal,
    error: catalogError,
  } = useCatalogProducts(
    isNonCustomer ? undefined : catalogMode === 'history' ? 'actual' : 'pricelist',
  )

  const addInquiryProduct = (product: (typeof catalogProducts)[number]) => {
    const productId = String(product.id)
    setInquiryItems((items) =>
      items.some((item) => item.productId === productId)
        ? items.filter((item) => item.productId !== productId)
        : [...items, { productId, name: product.itemName ?? product.itemCode ?? 'Produk' }],
    )
  }

  const submitInquiry = async () => {
    if (sendingInquiry || inquiryItems.length === 0) return
    setSendingInquiry(true)
    try {
      await api.post('/requests', {
        kind: 'inquiry',
        status: 'pending',
        items: inquiryItems.map(({ productId }) => ({ productId, qty: 1 })),
      })
      setInquiryItems([])
      toast.success('Inquiry berhasil dikirim')
      await refreshOrders()
    } catch (error) {
      console.error('Gagal mengirim inquiry', error)
      toast.error('Inquiry gagal dikirim. Pilihan produk tetap tersimpan.')
    } finally {
      setSendingInquiry(false)
    }
  }

  const error = categoriesError || catalogError

  return (
    <Shell title="TSM Order Portal" showBack={false}>
      <div className="space-y-6 pb-36">
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        {/* Greeting banner */}
        <div className="bg-primary text-white rounded-2xl p-5 lg:p-7 relative overflow-hidden">
          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 select-none pointer-events-none">
            <CategoryIcon name="mdi:chef-hat" width={64} height={64} className="text-white" />
          </div>

          <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">
            Selamat datang
          </p>

          <p className="font-bold text-xl lg:text-2xl mt-0.5">{currentUser?.name}</p>

          <p className="text-white/60 text-sm mt-1">{currentUser?.customer?.CardCode}</p>
        </div>

        <div className="w-full flex items-center gap-3 bg-white border border-border rounded-xl px-4 py-3 text-muted-foreground text-sm hover:border-accent/40 transition-colors">
          <button
            type="button"
            onClick={() => navigate('/search')}
            className="flex-1 flex items-center gap-3 text-left"
          >
            <Search size={15} className="shrink-0" />

            <span>{search ? search : 'Cari semua produk ...'}</span>
          </button>

          {search && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()

                setSearch('')
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Draft tersimpan: tampil setelah pencarian, sebelum kategori */}
        {isCustomer && savedDrafts.length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h2 className="text-sm font-bold text-foreground">Draft Tersimpan</h2>
              </div>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {savedDrafts.length} draft
              </span>
            </div>
            <div className="space-y-2">
              {savedDrafts.map((draft) => {
                const expanded = expandedDraftId === draft.id
                const draftItems = draft.items ?? []
                const qty = draftItems.reduce((sum, item) => sum + (item.qty ?? 0), 0)
                return (
                  <div key={draft.id} className="rounded-xl border border-border bg-white p-3">
                    <button
                      type="button"
                      onClick={() => setExpandedDraftId(expanded ? null : draft.id)}
                      aria-expanded={expanded}
                      className="flex w-full items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          Draft ·{' '}
                          {new Date(draft.createdAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {draftItems.length} jenis produk · {qty} unit
                        </p>
                      </div>
                      <ChevronRight
                        size={18}
                        className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`}
                      />
                    </button>
                    {expanded && (
                      <div className="mt-3 space-y-3 border-t border-border pt-3">
                        <div className="space-y-2">
                          {draftItems.map((item, index) => (
                            <div
                              key={`${item.product?.id ?? index}-${index}`}
                              className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground">
                                  {item.product?.itemName ?? 'Produk'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {`${item.qty ?? 0} unit`}
                                </p>
                              </div>
                              <span className="shrink-0 text-xs font-bold">× {item.qty ?? 0}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => continueDraft(draft)}
                            disabled={savingDraft || draftActionId !== null}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            <ChevronRight size={14} />
                            {editingDraftId === draft.id ? 'Cart Aktif' : 'Lanjutkan'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void cancelSavedDraft(draft.id)}
                            disabled={draftActionId !== null || savingDraft}
                            className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 disabled:opacity-50"
                          >
                            {draftActionId === draft.id ? 'Menghapus...' : 'Hapus Draft'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        <section ref={catalogRef} id="catalog-products" className="space-y-5 scroll-mt-6">
          {isCustomer && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCatalogMode('history')}
                aria-pressed={catalogMode === 'history'}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${catalogMode === 'history' ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground'}`}
              >
                <ShoppingBag size={17} /> Riwayat Pembelian
              </button>
              <button
                type="button"
                onClick={() => setCatalogMode('inquiry')}
                aria-pressed={catalogMode === 'inquiry'}
                className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold ${catalogMode === 'inquiry' ? 'border-primary bg-primary text-white' : 'border-border bg-white text-foreground'}`}
              >
                <Plus size={18} /> Inquiry Produk
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {catalogMode === 'inquiry' && isCustomer ? (
                <MessageSquareText size={19} className="text-primary mt-0.5" />
              ) : (
                <ShoppingBag size={19} className="text-primary mt-0.5" />
              )}
              <div>
                <h2 className="text-sm font-bold">
                  {isNonCustomer
                    ? 'Produk'
                    : catalogMode === 'history'
                      ? 'Riwayat Pembelian'
                      : 'Inquiry Produk'}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {isNonCustomer
                    ? 'Semua produk sesuai kategori atau pencarian'
                    : catalogMode === 'history'
                      ? 'Harga berdasarkan transaksi customer'
                      : 'Pilih produk yang belum pernah dibeli untuk mengirim inquiry'}
                </p>
              </div>
            </div>
            {!catalogLoading && catalogTotal > 0 && (
              <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                {catalogTotal} produk
              </span>
            )}
          </div>

          {catalogLoading ? (
            <Loader label="Memuat produk..." className="py-8" />
          ) : catalogProducts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-5 py-8 text-center">
              <PackageSearch size={24} className="mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-sm font-semibold">
                {isCustomer && catalogMode === 'history'
                  ? 'Belum ada riwayat pembelian'
                  : 'Tidak ada produk'}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Tidak ada produk tersedia pada kategori ini.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {isCustomer && catalogMode === 'inquiry' ? (
                <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
                  {catalogProducts.map((product) => {
                    const selected = inquiryItems.some(
                      (item) => item.productId === String(product.id),
                    )
                    return (
                      <div key={product.id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground">
                            {product.itemName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">{product.itemCode}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => addInquiryProduct(product)}
                          aria-label={
                            selected
                              ? `Batalkan inquiry ${product.itemName}`
                              : `Tambahkan inquiry ${product.itemName}`
                          }
                          aria-pressed={selected}
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${selected ? 'border-primary bg-primary text-white' : 'border-border bg-white text-primary'}`}
                        >
                          {selected ? <X size={18} /> : <Plus size={18} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <ProductList products={catalogProducts} cart={cart} />
              )}
              {!catalogReachingEnd && (
                <div className="flex items-center gap-4">
                  <hr className="flex-1 border-border" />
                  <button
                    type="button"
                    onClick={loadMoreCatalog}
                    disabled={catalogFetching}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold disabled:opacity-50"
                  >
                    {catalogFetching ? 'Memuat...' : 'Lebih banyak'} <ChevronDown size={16} />
                  </button>
                  <hr className="flex-1 border-border" />
                </div>
              )}
            </div>
          )}
        </section>

        {isCustomer && catalogMode === 'history' && cart.length > 0 && (
          <section
            className="space-y-3 rounded-2xl border border-border bg-white p-4"
            aria-label="Daftar Pembelian"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold">Daftar Pembelian</h2>
              <span className="text-xs text-muted-foreground">
                {cart.length} produk · {cart.reduce((n, line) => n + (line.qty ?? 0), 0)} unit
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-xs">
                <thead className="border-b border-border text-left text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-2">Produk</th>
                    <th className="px-2 text-center">Jumlah</th>
                    <th className="px-2 text-right">Subtotal</th>
                    <th className="w-8" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cart.map((line) => {
                    const price = Number(line.product.price)
                    const hasPrice = line.product.price != null && Number.isFinite(price)
                    return (
                      <tr key={line.product.id}>
                        <td className="py-3 pr-2 align-middle">
                          <div className="font-semibold">{line.product.itemName}</div>
                          <div className="mt-1 text-muted-foreground">
                            {hasPrice
                              ? `Rp ${price.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`
                              : 'Harga belum tersedia'}
                          </div>
                        </td>
                        <td className="px-2 align-middle">
                          <QuantityInput
                            quantity={line.qty ?? 1}
                            name={line.product.itemName}
                            onCommit={(qty) =>
                              setCart((previous) =>
                                previous.map((item) =>
                                  String(item.product.id) === String(line.product.id)
                                    ? { ...item, qty }
                                    : item,
                                ),
                              )
                            }
                          />
                        </td>
                        <td className="px-2 text-right align-middle whitespace-nowrap">
                          {hasPrice
                            ? `Rp ${(price * (line.qty ?? 0)).toLocaleString('id-ID', {
                                maximumFractionDigits: 0,
                              })}`
                            : '—'}
                        </td>
                        <td className="align-middle text-right">
                          <button
                            type="button"
                            aria-label={`Hapus ${line.product.itemName}`}
                            onClick={() =>
                              setCart((previous) =>
                                previous.filter(
                                  (item) => String(item.product.id) !== String(line.product.id),
                                ),
                              )
                            }
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-sm font-semibold">
              <span>Perkiraan Total</span>
              <span>
                {cart.every(
                  (line) =>
                    line.product.price != null && Number.isFinite(Number(line.product.price)),
                )
                  ? `Rp ${cart
                      .reduce((sum, line) => sum + Number(line.product.price) * (line.qty ?? 0), 0)
                      .toLocaleString('id-ID', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}`
                  : 'Ada harga belum tersedia'}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Perkiraan berdasarkan harga riwayat pembelian. Nilai akhir dapat berubah karena
              diskon, pajak, dan ketentuan lainnya.
            </p>
          </section>
        )}
      </div>

      {isCustomer && catalogMode === 'inquiry' && inquiryItems.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">{inquiryItems.length} produk dipilih</span>
            <button
              type="button"
              onClick={() => void submitInquiry()}
              disabled={sendingInquiry}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send size={16} /> {sendingInquiry ? 'Mengirim...' : 'Kirim Inquiry'}
            </button>
          </div>
        </div>
      )}

      {isCustomer && catalogMode === 'history' && (cart.length > 0 || editingDraftId !== null) && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm sm:bottom-6">
          {editingDraftId && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg bg-amber-50 px-2 py-2 text-xs text-amber-900">
              <span className="font-semibold">Cart Aktif: Draft Tersimpan</span>
            </div>
          )}
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{cart.length} jenis produk</span>
            <span>{cart.reduce((sum, item) => sum + (item.qty ?? 0), 0)} unit</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={saveCustomerDraft}
              disabled={savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent px-3 py-3 text-sm font-semibold text-accent disabled:opacity-50"
            >
              <Save size={16} />{' '}
              {savingDraft ? 'Menyimpan...' : editingDraftId ? 'Simpan Draft' : 'Simpan Draft'}
            </button>
            <button
              type="button"
              onClick={() => (editingDraftId ? void saveEditedDraft(true) : navigate('/cart'))}
              disabled={savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send size={16} /> Kirim Order
            </button>
          </div>
        </div>
      )}
    </Shell>
  )
}

export default CatalogPage
