import { CategoryIcon } from '../../categories'
import { Loader } from '../../common'
import { useAdminProductList } from '../hooks'
import ProductStatusBadge from './ProductStatusBadge '

const ProductMobileCard = () => {
  const { products, loading } = useAdminProductList()
  return (
    <div className="md:hidden space-y-3">
      {loading ? (
        <Loader label="Memuat produk..." className="py-12" />
      ) : products.length === 0 ? (
        <p className="text-center py-12 text-sm text-muted-foreground">Tidak ada produk</p>
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
              <span className="text-xs text-muted-foreground">{product.salesUnit || '-'}</span>
            </div>
            <span
              className={`inline-flex px-2 py-1 rounded-md text-[10px] font-semibold ${product.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}
            >
              <ProductStatusBadge isActive={product.isActive} />
            </span>
          </div>
        ))
      )}
    </div>
  )
}

export default ProductMobileCard
