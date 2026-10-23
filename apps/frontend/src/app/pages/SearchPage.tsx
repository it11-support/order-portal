import { Search, X, Package, ArrowLeft, ChevronDown, Save, Send } from 'lucide-react'
import { ProductList } from '@components'
import { BottomNav } from '@layouts'
import { memo, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useAuth,
  useCart,
  useCategories,
  useCatalogProducts,
  useOrders,
  resolveCatalogQuery,
} from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import ActiveCartList from './ActiveCartList'
import { api } from '@lib'
import { toast } from 'sonner'
import DraftOrdersList from './DraftOrdersList'
import { useActiveDraft } from '../hooks/useActiveDraft'

const MemoProductList = memo(ProductList)

const SearchPage = () => {
  const { cart, setCart } = useCart()
  const { user: currentUser } = useAuth()
  const { refreshOrders } = useOrders()
  const [savingDraft, setSavingDraft] = useState(false)
  const { editingDraftId, setEditingDraftId } = useActiveDraft()
  const navigate = useNavigate()
  const {
    categories,
    search,
    setSearch,
    setSelectedCategory,
    selectedCategory,
    loading: categoriesLoading,
  } = useCategories()
  const {
    products: filteredProducts,
    loading: productsLoading,
    isFetching: catalogIsFetching,
    isReachingEnd: catalogIsReachingEnd,
    loadMore: loadMoreCatalogProducts,
    total: catalogTotal,
    error: catalogError,
  } = useCatalogProducts()
  const loading = categoriesLoading || productsLoading
  const query = useMemo(
    () => resolveCatalogQuery(selectedCategory, search),
    [selectedCategory, search],
  )
  const isSearching = query.mode === 'search'
  const isCustomer = currentUser?.role.name === 'customer'
  const handleCategoryChange = (code: string) => {
    setSearch('')
    setSelectedCategory(code)
  }
  const handleAllCategory = () => {
    setSearch('')
    setSelectedCategory('')
  }
  const categoryFilterButtons = useMemo(() => {
    const otherCat = categories.find((c) => c.code === 'OTHER')
    const rest = categories.filter((c) => c.code !== 'OTHER')
    return [...(otherCat ? [otherCat] : []), ...rest]
  }, [categories])
  const saveDraft = async () => {
    if (savingDraft || !cart.length) return
    setSavingDraft(true)
    try {
      const unique = new Map(cart.map((line) => [String(line.product.id), line]))
      const items = [...unique.values()]
        .filter((line) => (line.qty ?? 0) > 0)
        .map((line) => ({ productId: String(line.product.id), qty: Number(line.qty) }))
      if (editingDraftId) {
        await api.patch(`/requests/${editingDraftId}`, { items })
      } else {
        await api.post('/requests', { kind: 'order', status: 'draft', items })
      }
      setCart([])
      setEditingDraftId(null)
      await refreshOrders()
      toast.success('Draft berhasil disimpan')
    } catch (error) {
      console.error('Gagal menyimpan draft', error)
      toast.error('Gagal menyimpan draft. Keranjang tetap tersimpan.')
    } finally {
      setSavingDraft(false)
    }
  }
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-2 px-4 h-14">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-secondary transition-colors shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 flex items-center bg-input-background border border-border rounded-xl px-3 gap-2">
          <Search size={14} className="text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari semua produk ..."
            className="flex-1 min-w-0 bg-transparent py-2.5 text-sm focus:outline-none"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian">
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>
      <main
        className={`flex-1 overflow-y-auto ${isCustomer && cart.length ? 'pb-44' : 'pb-20'} lg:pb-24`}
      >
        <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8 space-y-5">
          {catalogError && (
            <p role="alert" className="text-sm text-red-600">
              {catalogError}
            </p>
          )}
          {isCustomer && (
            <section>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  type="button"
                  onClick={handleAllCategory}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${!selectedCategory ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-white text-foreground'}`}
                >
                  Semua
                </button>
                {categoryFilterButtons.map((cat) => (
                  <button
                    type="button"
                    key={cat.code}
                    onClick={() => handleCategoryChange(cat.code)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${selectedCategory === cat.code ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-white text-foreground'}`}
                  >
                    {cat.icon && <CategoryIcon name={cat.icon} size={14} className="shrink-0" />}
                    {cat.name}
                  </button>
                ))}
              </div>
            </section>
          )}
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">Mencari produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={44} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm font-semibold">Produk tidak ditemukan</p>
              <p className="text-xs mt-1">
                {isSearching
                  ? 'Coba kata kunci lain'
                  : selectedCategory
                    ? 'Tidak ada produk pada kategori ini'
                    : ''}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-xs text-muted-foreground font-semibold">
                {isSearching
                  ? `${catalogTotal || filteredProducts.length} produk untuk "${query.search}"`
                  : selectedCategory
                    ? `${catalogTotal || filteredProducts.length} produk pada kategori ini`
                    : `${catalogTotal || filteredProducts.length} produk`}
              </p>
              <MemoProductList products={filteredProducts} cart={cart} />
              {!catalogIsReachingEnd && (
                <div className="flex items-center gap-4">
                  <hr className="flex-1 border-border" />
                  <button
                    type="button"
                    onClick={loadMoreCatalogProducts}
                    disabled={catalogIsFetching}
                    className="shrink-0 rounded-full border border-border bg-white px-5 py-2 text-sm font-semibold text-foreground hover:border-accent/40 transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {catalogIsFetching ? 'Memuat...' : 'Lebih banyak'}
                    <ChevronDown size={16} />
                  </button>
                  <hr className="flex-1 border-border" />
                </div>
              )}
            </div>
          )}
          {isCustomer && <ActiveCartList />}
          {isCustomer && <DraftOrdersList />}
        </div>
      </main>
      {isCustomer && cart.length > 0 && (
        <div className="fixed bottom-20 lg:bottom-4 left-1/2 z-30 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-border bg-white/95 p-3 shadow-xl backdrop-blur-sm">
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>{cart.length} jenis produk</span>
            <span>{cart.reduce((sum, line) => sum + (line.qty ?? 0), 0)} unit</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void saveDraft()}
              disabled={savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-accent px-3 py-3 text-sm font-semibold text-accent disabled:opacity-50"
            >
              <Save size={16} />
              {savingDraft ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cart')}
              disabled={savingDraft}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-3 py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Send size={16} />
              Kirim Order
            </button>
          </div>
        </div>
      )}
      {isCustomer && <BottomNav />}
    </div>
  )
}
export default SearchPage
