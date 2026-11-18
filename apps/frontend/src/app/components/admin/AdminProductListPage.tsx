import { Shell } from '@layouts'
import { useAdminProductList } from './hooks'
import ProductFilter from './products/ProductFilter'
import ProductMobileCard from './products/ProductMobileCard'
import ProductTable from './products/ProductTable'

const AdminProductListPage = () => {
  const { products, loading, isFetching, isReachingEnd, total, loadMore } = useAdminProductList()

  return (
    <Shell title="Product List" showBack>
      <div className="p-4 max-w-7xl mx-auto bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-800">Product List</h1>

          <p className="text-xs text-gray-500">Daftar produk</p>
        </div>

        {/* Filter */}
        <ProductFilter />

        {/* CARD VIEW — mobile only */}
        <ProductMobileCard />

        {/* TABLE VIEW — desktop only */}
        <ProductTable />

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
