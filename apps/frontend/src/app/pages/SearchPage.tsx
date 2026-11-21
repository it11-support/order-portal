import { Search, X, Package, ArrowLeft, ChevronDown } from 'lucide-react'
import { ProductList } from '@components'
import { BottomNav } from '@layouts'
import { memo, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, useCategories, useCatalogProducts, resolveCatalogQuery } from '@contexts'
import CategoryIcon from '@components/categories/CategoryIcon'
import ActiveCartList from '@components/cart/ActiveCartList'

import DraftOrdersList from '@components/orders/DraftOrdersList'
import CartActionBar from '../components/catalog/CartActionBar'
import { useCatalogDrafts } from '../components/catalog/hooks/useCatalogDrafts'

const MemoProductList = memo(ProductList)

const SearchPage = () => {
  const { isCustomer } = useAuth()

  const navigate = useNavigate()
  const productSearchRef = useRef<HTMLInputElement | null>(null)
  const {
    categories,
    search,
    setSearch,
    setSelectedCategory,
    selectedCategory,
    loading: categoriesLoading,
  } = useCategories()

  const {
    cart,
    savingDraft,
    editingDraftId,
    saveEditedDraft,
    cancelSavedDraft,
    saveCustomerDraft,
    confirmExitDraft,
  } = useCatalogDrafts(isCustomer)

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
        <div className="flex flex-1 min-w-0 items-center gap-2 rounded-xl border border-border bg-input-background px-3 focus-within:border-accent">
          <Search size={16} className="shrink-0 text-muted-foreground" />
          <input
            ref={productSearchRef}
            autoFocus
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setSearch('')
                productSearchRef.current?.blur()
              }
            }}
            placeholder="Cari nama atau kode produk"
            autoComplete="off"
            aria-label="Cari produk"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none [appearance:textfield] [&::-webkit-search-cancel-button]:hidden"
          />
          {catalogIsFetching && search.trim() && (
            <span
              className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
              aria-label="Memperbarui hasil"
            />
          )}
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearch('')
                productSearchRef.current?.focus()
              }}
              aria-label="Hapus pencarian"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
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
          {isCustomer && !isSearching && (
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
          {loading && filteredProducts.length === 0 ? (
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
              <p className="text-xs text-muted-foreground font-semibold" aria-live="polite">
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
        <CartActionBar
          cart={cart}
          editingDraftId={editingDraftId}
          savingDraft={savingDraft}
          onSave={saveCustomerDraft}
          onSubmit={() => (editingDraftId ? saveEditedDraft(true) : navigate('/cart'))}
          onExitDraft={confirmExitDraft}
          onCancelDraft={(id) => void cancelSavedDraft(id)}
        />
      )}
      {isCustomer && <BottomNav />}
    </div>
  )
}
export default SearchPage
