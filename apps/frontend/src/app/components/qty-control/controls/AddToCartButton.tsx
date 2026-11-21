import { ShoppingCart } from 'lucide-react'
import type { useQtyControl } from '../hooks/useQtyControl'

type QtyState = ReturnType<typeof useQtyControl>

type Props = Pick<QtyState, 'isCustomer' | 'disabled' | 'isActualPrice' | 'handleAdd'> & {
  cardcode?: string
}

const AddToCartButton = ({ isCustomer, cardcode, disabled, isActualPrice, handleAdd }: Props) => {
  if (!isCustomer && !cardcode) return null

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={disabled}
      className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-primary hover:bg-secondary disabled:opacity-50"
      title={isActualPrice ? 'Tambah ke keranjang' : 'Lihat opsi harga'}
    >
      <ShoppingCart size={18} />
    </button>
  )
}

export default AddToCartButton
