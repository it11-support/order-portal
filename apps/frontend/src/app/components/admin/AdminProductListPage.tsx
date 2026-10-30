import { Search, ArrowUpDown, X, Check, ChevronDown } from 'lucide-react'
import { Loader } from '@components'
import { Shell } from '@layouts'
import { useCategories, useProducts } from '@contexts'
import CategoryIcon from '@/app/components/categories/CategoryIcon'
import { useState } from 'react'

const AdminProductListPage = () => {
  const {
    products,
    loading,
    isFetching,
    isReachingEnd,
    total,

    filters,
    setSearch,
    setCategory,

    sortBy,
    sortDirection,
    setSortBy,
    setSortDirection,

    loadMore,
  } = useProducts()

  const { categories } = useCategories()

  const [categoryOpen, setCategoryOpen] = useState(false)

  const selectedCategory = categories.find((category) => category.name === filters.category)

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
      return
    }

    setSortBy(field)
    setSortDirection('asc')
  }

  return (
    <Shell title="Product List" showBack>
      <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Product List</h1>

          <p className="text-xs text-gray-500">Daftar produk</p>
        </div>

        {/* Filter */}
        <div className="py-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="
                  absolute
                  left-3
                  top-1/2
                  -translate-y-1/2
                  text-gray-400
                "
              />

              <input
                type="text"
                value={filters.search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk..."
                className="
                  w-full
                  rounded-xl
                  border border-gray-200
                  bg-white
                  pl-9
                  pr-9
                  py-2.5
                  text-sm
                  outline-none
                  focus:border-accent
                "
              />

              {filters.search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="
                    absolute
                    right-3
                    top-1/2
                    -translate-y-1/2
                    text-gray-400
                    hover:text-gray-600
                  "
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Category */}

            <div className="relative">
              <button
                type="button"
                onClick={() => setCategoryOpen((prev) => !prev)}
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
                  min-w-[180px]
                  rounded-xl
                  border border-gray-200
                  bg-white
                  px-4
                  py-2.5
                  text-sm
                  font-medium
                  text-gray-700
                  transition
                  hover:border-gray-300
                  focus:outline-none
                  focus:border-accent
                  focus:ring-2
                  focus:ring-accent/10
                "
              >
                <span>{selectedCategory?.name || 'Semua kategori'}</span>

                <ChevronDown
                  size={16}
                  className={`
                    text-gray-400
                    transition-transform
                    ${categoryOpen ? 'rotate-180' : ''}
                  `}
                />
              </button>

              {categoryOpen && (
                <div
                  className="
                    absolute
                    left-0
                    top-full
                    z-50
                    mt-2
                    w-full
                    min-w-[180px]
                    overflow-hidden
                    rounded-xl
                    border border-gray-200
                    bg-white
                    p-1
                    shadow-lg
                  "
                >
                  {/* Semua */}
                  <button
                    type="button"
                    onClick={() => {
                      setCategory('')
                      setCategoryOpen(false)
                    }}
                    className={`
                      flex
                      w-full
                      items-center
                      justify-between
                      rounded-lg
                      px-3
                      py-2.5
                      text-left
                      text-sm
                      transition
                      ${
                        !filters.category
                          ? 'bg-accent/10 text-accent font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                    `}
                  >
                    <span>Semua kategori</span>

                    {!filters.category && <Check size={15} />}
                  </button>

                  {/* Categories */}
                  {categories.map((category) => {
                    const active = filters.category === category.name

                    return (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => {
                          setCategory(category.name)
                          setCategoryOpen(false)
                        }}
                        className={`
                            flex
                            w-full
                            items-center
                            justify-between
                            rounded-lg
                            px-3
                            py-2.5
                            text-left
                            text-sm
                            transition
                            ${
                              active
                                ? 'bg-accent/10 text-accent font-semibold'
                                : 'text-gray-700 hover:bg-gray-50'
                            }
                          `}
                      >
                        <span>{category.name}</span>

                        {active && <Check size={15} />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD VIEW — mobile only */}
          <div className="md:hidden space-y-3">
            {loading ? (
              <Loader label="Memuat produk..." className="py-12" />
            ) : products.length === 0 ? (
              <p className="text-center py-12 text-sm text-muted-foreground">
                Tidak ada produk
              </p>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-white rounded-xl border border-border p-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <CategoryIcon name="mdi:package-variant" size={16} />
                    </div>
                    <span className="font-medium text-sm">{product.itemName}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                      {product.itemCode}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                      {product.productCategory}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {product.salesUnit || '-'}
                    </span>
                  </div>
                  <span className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold ${product.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* TABLE VIEW — desktop only */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {/* Name */}
                    <th className="p-4">
                      <button
                        type="button"
                        onClick={() => handleSort('itemName')}
                        className="flex items-center gap-1 hover:text-gray-800"
                      >
                        Nama Produk
                        <ArrowUpDown size={12} />
                      </button>
                    </th>

                    {/* Code */}
                    <th className="p-4 w-32">
                      <button
                        type="button"
                        onClick={() => handleSort('itemCode')}
                        className="flex items-center gap-1 hover:text-gray-800"
                      >
                        Kode
                        <ArrowUpDown size={12} />
                      </button>
                    </th>

                    {/* Category */}
                    <th className="p-4 w-40">Kategori</th>

                    {/* Unit */}
                    <th className="p-4 w-28 text-center">Unit</th>

                    {/* Pack */}
                    <th className="p-4 w-32 text-center">Pack Size</th>

                    {/* Status */}
                    <th className="p-4 w-28 text-center">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center">
                        <Loader label="Memuat produk..." />
                      </td>
                    </tr>
                  ) : products.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-gray-400">
                        Tidak ada produk
                      </td>
                    </tr>
                  ) : (
                    products.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50/70 transition-colors">
                        {/* Product */}
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <CategoryIcon name="mdi:package-variant" size={16} />
                            </div>

                            <div>
                              <span className="font-medium">{product.itemName}</span>
                            </div>
                          </div>
                        </td>

                        {/* Code */}
                        <td className="p-4">
                          <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                            {product.itemCode}
                          </span>
                        </td>

                        {/* Category */}
                        <td className="p-4">
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md font-medium">
                            {product.productCategory}
                          </span>
                        </td>

                        {/* Unit */}
                        <td className="p-4 text-center">{product.salesUnit || '-'}</td>

                        {/* Pack */}
                        <td className="p-4 text-center">
                          {product.salesPackSize
                            ? `${product.salesPackSize} ${
                                product.salesPackUnit || product.salesUnit || ''
                              }`
                            : '-'}
                        </td>

                        {/* Status */}
                        <td className="p-4 text-center">
                          <span
                            className={`
                              inline-flex
                              px-2
                              py-1
                              rounded-md
                              text-[10px]
                              font-semibold
                              ${
                                product.isActive
                                  ? 'bg-green-50 text-green-600'
                                  : 'bg-gray-100 text-gray-500'
                              }
                            `}
                          >
                            {product.isActive ? 'ACTIVE' : 'INACTIVE'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
            </table>
          </div>
        </div>

        {/* Load More */}
        {!loading && products.length > 0 && !isReachingEnd && (
          <div className="border-t border-gray-200 pt-6 mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500">{total} produk</p>

            <button
              type="button"
              onClick={loadMore}
              disabled={isFetching}
              className="
                h-9
                rounded-lg
                border border-gray-200
                px-4
                text-xs
                font-medium
                text-gray-700
                transition
                hover:bg-gray-50
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {isFetching ? 'Memuat...' : 'Load More'}
            </button>
          </div>
        )}

        {!loading && isReachingEnd && products.length > 0 && (
          <p className="border-t border-gray-200 pt-6 mt-2 text-center text-xs text-gray-400">
            Semua produk telah dimuat
          </p>
        )}
      </div>
    </Shell>
  )
}

export default AdminProductListPage
