import { Search, X, Package, ArrowLeft } from 'lucide-react'
import { ProductList } from '@components'
import { BottomNav } from '@layouts'

import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, useCart, useCategories } from '@contexts'
import SuggestedItems from '@/app/components/products/SuggestedItems'

const SearchPage = () => {
  const { cart, increase, decrease, remove } = useCart()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const { filteredProducts, selectedCategory, search, setSearch, loading } = useCategories()

  const searchInputRef = useRef<HTMLInputElement>(null)

  const searchProduct = filteredProducts

  return (
    <div className="min-h-screen bg-background">
      {/* Search Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-2 px-4 h-14">
        <button
          onClick={() => navigate(-1)}
          className="
            w-9 h-9
            flex items-center justify-center
            rounded-full
            hover:bg-secondary
            transition-colors
            shrink-0
          "
        >
          <ArrowLeft size={18} />
        </button>

        <div
          className="
            flex-1
            flex items-center
            bg-input-background
            border border-border
            rounded-xl
            px-3 gap-2
          "
        >
          <Search size={14} className="text-muted-foreground shrink-0" />

          <input
            ref={searchInputRef}
            autoFocus
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
            }}
            placeholder={
              selectedCategory
                ? `Cari produk pada kategori ${selectedCategory} ...`
                : 'Cari semua produk ...'
            }
            className="
              flex-1
              bg-transparent
              py-2.5
              text-sm
              focus:outline-none
            "
          />

          {search && (
            <button type="button" onClick={() => setSearch('')}>
              <X size={14} className="text-muted-foreground" />
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">Mencari produk...</p>
            </div>
          ) : searchProduct.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={44} className="mx-auto mb-3 opacity-20" />

              <p className="text-sm font-semibold">Produk tidak ditemukan</p>

              {search && <p className="text-xs mt-1">Coba kata kunci lain</p>}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground font-semibold">
                {searchProduct.length} produk ditemukan
              </p>

              <ProductList
                products={searchProduct}
                cart={cart}
                increase={increase}
                decrease={decrease}
                remove={remove}
              />
            </div>
          )}
          <SuggestedItems key={String(currentUser?.id)} />
        </div>
      </main>

      {currentUser?.role.name === 'customer' && <BottomNav />}
    </div>
  )
}

export default SearchPage
