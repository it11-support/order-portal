import { Search, X, Package, ArrowLeft } from 'lucide-react'
import { ProductList } from '@components'
import { BottomNav } from '@layouts'

import { useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth, useCart, useCategories } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import SuggestedItems from '@/app/components/products/SuggestedItems'

const SearchPage = () => {
  const { cart } = useCart()
  const { user: currentUser } = useAuth()
  const navigate = useNavigate()

  const {
    categories,
    filteredProducts,
    search,
    setSearch,
    setSelectedCategory,
    selectedCategory,
    loading,
  } = useCategories()

  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelectedCategory('')
  }, [setSelectedCategory])

  const getCategoryName = (code: string) => {
    if (code === 'OTHER') return 'Produk Lain'
    if (code === 'SUGGESTED') return 'Disarankan'

    return categories.find((category) => category.code === code)?.name || code
  }

  const handleCategoryChange = (code: string) => {
    setSearch('')
    setSelectedCategory(code)
  }

  const handleAllCategory = () => {
    setSearch('')
    setSelectedCategory('')
  }

  const isSuggested = selectedCategory === 'SUGGESTED'

  const groupedProducts = filteredProducts.reduce<Record<string, typeof filteredProducts>>(
    (groups, product) => {
      const categoryCode = product.productCategory || ''

      if (!groups[categoryCode]) {
        groups[categoryCode] = []
      }

      groups[categoryCode].push(product)

      return groups
    },
    {},
  )

  const categoryFilterButtons = useMemo(() => {
    const otherCat = categories.find((c) => c.code === 'OTHER')
    const rest = categories.filter((c) => c.code !== 'OTHER' && c.code !== 'SUGGESTED')

    const result: Array<{ code: string; name: string; icon?: string }> = []

    if (otherCat) {
      result.push({
        code: otherCat.code,
        name: otherCat.name,
        icon: otherCat.icon,
      })
    }

    for (const cat of rest) {
      result.push({
        code: cat.code,
        name: cat.name,
        icon: cat.icon,
      })
    }

    return result
  }, [categories])

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
          {/* Category filter */}
          {currentUser?.role.name === 'customer' && (
            <section className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                  type="button"
                  onClick={handleAllCategory}
                  className={`
                    shrink-0 flex items-center gap-1.5
                    rounded-full border px-3 py-1.5 text-xs font-semibold
                    transition-colors
                    ${
                      !selectedCategory
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-white hover:border-accent/40 text-foreground'
                    }
                  `}
                >
                  Semua
                </button>

                {categoryFilterButtons.map((cat) => (
                  <button
                    type="button"
                    key={cat.code}
                    onClick={() => handleCategoryChange(cat.code)}
                    className={`
                      shrink-0 flex items-center gap-1.5
                      rounded-full border px-3 py-1.5 text-xs font-semibold
                      transition-colors
                      ${
                        selectedCategory === cat.code
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border bg-white hover:border-accent/40 text-foreground'
                      }
                    `}
                  >
                    {cat.icon && <CategoryIcon name={cat.icon} size={14} className="shrink-0" />}
                    {cat.name}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => handleCategoryChange('SUGGESTED')}
                  className={`
                    shrink-0 flex items-center gap-1.5
                    rounded-full border px-3 py-1.5 text-xs font-semibold
                    transition-colors
                    ${
                      selectedCategory === 'SUGGESTED'
                        ? 'border-accent bg-accent/10 text-accent'
                        : 'border-border bg-white hover:border-accent/40 text-foreground'
                    }
                  `}
                >
                  Disarankan
                </button>
              </div>
            </section>
          )}

          {loading ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-sm">Mencari produk...</p>
            </div>
          ) : isSuggested ? (
            <div className="space-y-8">
              <p className="text-xs text-muted-foreground font-semibold">Produk disarankan</p>
              <SuggestedItems />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Package size={44} className="mx-auto mb-3 opacity-20" />

              <p className="text-sm font-semibold">Produk tidak ditemukan</p>

              {search && <p className="text-xs mt-1">Coba kata kunci lain</p>}
            </div>
          ) : !selectedCategory ? (
            <div className="space-y-8">
              <p className="text-xs text-muted-foreground font-semibold">
                Semua produk
              </p>
              <ProductList products={filteredProducts} cart={cart} />
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

          {currentUser?.role.name === 'customer' && !isSuggested && (
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
