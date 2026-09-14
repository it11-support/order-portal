import { Search, X, Package, ArrowLeft } from 'lucide-react'
import { ProductList } from '@components'
import { BottomNav } from '@layouts'

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, useCart, useCategories } from '@contexts'
import SuggestedItems from '@/app/components/products/SuggestedItems'

const SearchPage = () => {
  const { cart } = useCart()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const { categories, filteredProducts, search, setSearch, setSelectedCategory, loading } =
    useCategories()

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedCategory('')
  }, [setSelectedCategory])

  const groupedProducts = filteredProducts.reduce<Record<string, typeof filteredProducts>>(
    (groups, product) => {
      const categoryCode = product.productCategory || 'OTHER'

      if (!groups[categoryCode]) {
        groups[categoryCode] = []
      }

      groups[categoryCode].push(product)

      return groups
    },
    {},
  )

  const getCategoryName = (code: string) => {
    if (code === 'OTHER') return 'Produk Lain'

    return categories.find((category) => category.code === code)?.name || code
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 bg-white border-b border-border flex items-center gap-2 px-4 h-14">
        <button
          type="button"
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
            placeholder="Cari semua produk ..."
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

      <main className="flex-1 overflow-y-auto pb-20 lg:pb-8">
        <div className="max-w-5xl mx-auto px-4 py-4 lg:py-6 lg:px-8">
          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">Mencari produk...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={44} className="mx-auto mb-3 opacity-20" />

              <p className="text-sm font-semibold">Produk tidak ditemukan</p>

              {search && <p className="text-xs mt-1">Coba kata kunci lain</p>}
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-xs text-muted-foreground font-semibold">
                {filteredProducts.length} produk ditemukan
              </p>

              {Object.entries(groupedProducts).map(([categoryCode, products]) => (
                <section key={categoryCode} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {getCategoryName(categoryCode)}
                    </h2>

                    <span className="text-[10px] text-muted-foreground">
                      {products.length} produk
                    </span>
                  </div>

                  <ProductList products={products} cart={cart} />
                </section>
              ))}
            </div>
          )}

          {currentUser?.role.name === 'customer' && (
            <div className="mt-10 border-t border-border pt-8">
              <SuggestedItems key={String(currentUser?.id)} />
            </div>
          )}
        </div>
      </main>

      {currentUser?.role.name === 'customer' && <BottomNav />}
    </div>
  )
}

export default SearchPage
