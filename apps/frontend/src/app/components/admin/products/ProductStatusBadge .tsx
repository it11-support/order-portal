type ProductStatusBadgeProps = {
  isActive: boolean
}

const ProductStatusBadge = ({ isActive }: ProductStatusBadgeProps) => (
  <span
    className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${
      isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
    }`}
  >
    {isActive ? 'ACTIVE' : 'INACTIVE'}
  </span>
)

export default ProductStatusBadge
