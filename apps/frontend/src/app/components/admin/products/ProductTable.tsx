import { ArrowUpDown } from 'lucide-react'
import { useAdminProductList } from '../hooks'
import { Loader } from '../../common'
import { CategoryIcon } from '../../categories'
import ProductStatusBadge from './ProductStatusBadge '

const ProductTable = () => {
  const { products, loading, handleSort } = useAdminProductList()
  return (
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
                    <ProductStatusBadge isActive={product.isActive} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProductTable
