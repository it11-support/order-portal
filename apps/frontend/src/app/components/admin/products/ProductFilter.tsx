import { Check, ChevronDown, Search, X } from 'lucide-react'
import { useAdminProductList } from '../hooks'

const ProductFilter = () => {
  const {
    filters,
    categories,
    selectedCategory,
    categoryOpen,
    setCategoryOpen,
    setSearch,
    clearSearch,
    selectCategory,
  } = useAdminProductList()
  return (
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
              onClick={clearSearch}
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
                  min-w-45
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
                    min-w-45
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
                  selectCategory('')
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
                      selectCategory(category.name)
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
  )
}

export default ProductFilter
