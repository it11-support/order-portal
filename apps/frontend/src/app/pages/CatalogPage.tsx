import { Search, X, ChevronDown } from 'lucide-react'
import { Shell } from '@layouts'
import { useNavigate } from 'react-router-dom'
import { ProductList } from '@components'
import { useAuth, useCart, useCategories, useCatalogProducts, resolveCatalogQuery } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { useMemo } from 'react'

const CatalogPage = () => {
  const { isAdmin, user: currentUser } = useAuth()
  const navigate = useNavigate()
  const { cart } = useCart()

  const {
    categories,
    loading: categoriesLoading,
    selectedCategory,
    search,
    setSelectedCategory,
    setSearch,
    error: categoriesError,
  } = useCategories()

  const {
    products: catalogProducts,
    loading: catalogLoading,
    isFetching: catalogIsFetching,
    isReachingEnd: catalogIsReachingEnd,
    loadMore: loadMoreCatalogProducts,
    total: catalogTotal,
    error: catalogError,
  } = useCatalogProducts()

  const error = categoriesError || catalogError

  /**
   * Pilih kategori.
   *
   * Search di-reset supaya kategori baru
   * tidak menggunakan keyword search sebelumnya.
   */
  const handleCategoryChange = (categoryCode: string) => {
    setSearch('')
    setSelectedCategory(categoryCode)
  }

  /**
   * Reset ke semua kategori.
   */
  const handleAllCategory = () => {
    setSearch('')
    setSelectedCategory('')
  }

  const query = useMemo(
    () => resolveCatalogQuery(selectedCategory, search),
    [selectedCategory, search],
  )

  const isSearching = query.mode === 'search'

  /**
   * Search mengesampingkan kategori: hasilnya satu daftar global, jadi
   * judulnya bukan lagi nama kategori yang kebetulan masih terpilih.
   */
  const categoryLabel = useMemo(() => {
    if (isSearching) {
      return `Hasil pencarian "${query.search}"`
    }

    if (selectedCategory === 'OTHER') return 'Produk Lain'

    if (!selectedCategory) {
      return 'Semua Produk'
    }

    const category = categories.find((category) => category.code === selectedCategory)

    return category ? `PRODUK ${category.name}` : 'Semua Produk'
  }, [categories, selectedCategory, isSearching, query.search, currentUser?.role.name])

  return (
    <Shell title="TSM Order Portal" showBack={false}>
      <div className="space-y-6">
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

        {/* Search */}
        <div
          className="
            w-full
            flex items-center gap-3
            bg-white
            border border-border
            rounded-xl
            px-4 py-3
            text-muted-foreground
            text-sm
            hover:border-accent/40
            transition-colors
          "
        >
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
              className="
                w-6 h-6
                flex items-center justify-center
                rounded-full
                hover:bg-secondary
                text-muted-foreground
                hover:text-foreground
                transition-colors
                shrink-0
              "
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Categories */}
        <section>
          <h2
            className="
              text-[11px]
              font-bold
              text-muted-foreground
              uppercase
              tracking-wider
              mb-3
            "
          >
            Kategori
          </h2>

          {categoriesLoading && categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Memuat...</div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-4 lg:grid-cols-8 gap-2">
              {/* ALL */}
              <button
                type="button"
                onClick={handleAllCategory}
                className={`
                  flex flex-col
                  items-center
                  gap-1.5
                  rounded-xl
                  border
                  py-3
                  px-1
                  transition-all
                  active:scale-95
                  ${
                    !selectedCategory
                      ? 'border-accent bg-accent/10 text-accent shadow-sm'
                      : 'border-border bg-white hover:border-accent hover:bg-accent/5'
                  }
                `}
              >
                <span className="text-2xl">📦</span>

                <span
                  className={`
                    text-[10px]
                    font-semibold
                    text-center
                    leading-tight
                    ${!selectedCategory ? 'text-accent' : 'text-foreground'}
                  `}
                >
                  All
                </span>
              </button>

              {/* CATEGORIES */}
              {categories
                .filter((category) => category.isActive)
                .map((category) => {
                  const isSelected = category.code === selectedCategory

                  return (
                    <button
                      type="button"
                      key={category.id}
                      onClick={() => handleCategoryChange(category.code)}
                      className={`
                        flex flex-col
                        items-center
                        gap-1.5
                        rounded-xl
                        border
                        py-3
                        px-1
                        transition-all
                        active:scale-95
                        ${
                          isSelected
                            ? 'border-accent bg-accent/10 text-accent shadow-sm'
                            : 'border-border bg-white hover:border-accent hover:bg-accent/5'
                        }
                      `}
                    >
                      <span className="text-2xl">
                        {category.icon ? (
                          <CategoryIcon
                            name={category.icon}
                            size={24}
                            className={isSelected ? 'text-accent' : 'text-emerald-600'}
                          />
                        ) : (
                          '-'
                        )}
                      </span>

                      <span
                        className={`
                          text-[10px]
                          font-semibold
                          text-center
                          leading-tight
                          ${isSelected ? 'text-accent' : 'text-foreground'}
                        `}
                      >
                        {category.name}
                      </span>
                    </button>
                  )
                })}
            </div>
          )}
        </section>

        {/* Products */}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2
              className="
                text-[11px]
                font-bold
                text-muted-foreground
                uppercase
                tracking-wider
              "
            >
              {categoryLabel}
            </h2>

            {(catalogTotal > 0 ? catalogTotal : catalogProducts.length) > 0 && (
              <span className="text-[10px] text-muted-foreground">
                {catalogTotal > 0 ? catalogTotal : catalogProducts.length} produk
              </span>
            )}
          </div>

          {catalogLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">Memuat produk...</p>
            </div>
          ) : catalogProducts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm font-semibold">Produk tidak ditemukan</p>

              {isSearching ? (
                <p className="text-xs mt-1">Coba kata kunci lain</p>
              ) : (
                selectedCategory && (
                  <p className="text-xs mt-1">Tidak ada produk pada kategori {selectedCategory}</p>
                )
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <ProductList products={catalogProducts} cart={cart} />

              {!catalogIsReachingEnd && (
                <div className="flex items-center gap-4">
                  <hr className="flex-1 border-border" />

                  <button
                    type="button"
                    onClick={loadMoreCatalogProducts}
                    disabled={catalogIsFetching}
                    className="
                      shrink-0
                      rounded-full
                      border border-border
                      bg-white
                      px-5 py-2
                      text-sm font-semibold
                      text-foreground
                      hover:border-accent/40
                      transition-colors
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      disabled:opacity-50
                    "
                  >
                    {catalogIsFetching ? 'Memuat...' : 'Lebih banyak'}
                    <ChevronDown size={16} />
                  </button>

                  <hr className="flex-1 border-border" />
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </Shell>
  )
}

export default CatalogPage
