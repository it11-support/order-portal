import { Product } from '@repo/shared'
import { Minus, Plus, Trash2, LucidePackagePlus } from 'lucide-react'
import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts'

type QtyControlProps = {
  product: Product
}

const QtyControlComponent = ({ product }: QtyControlProps) => {
  const { isCustomer } = useAuth()
  const {
    onQtyChange,
    increase: onIncrease,
    decrease: onDecrease,
    getQty,
    remove: onRemove,
  } = useCart()

  const qty = getQty(product.id)

  const [inputValue, setInputValue] = React.useState(String(qty))
  const [isEditing, setIsEditing] = React.useState(false)

  React.useEffect(() => {
    if (!isEditing) {
      setInputValue(String(qty))
    }
  }, [qty, isEditing])

  if (!isCustomer) return null

  if (qty === 0 && !isEditing) {
    return (
      <button
        onClick={() => onIncrease(product)}
        className="cursor-pointer flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
      >
        <LucidePackagePlus size={16} />
      </button>
    )
  }

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value

    setInputValue(value)

    // Izinkan kosong sementara saat user sedang mengetik
    if (value === '') return

    const newQty = Number(value)

    if (!Number.isNaN(newQty) && newQty >= 0) {
      onQtyChange(product, newQty)
    }
  }

  const handleBlur = () => {
    setIsEditing(false)

    if (inputValue === '' || Number(inputValue) <= 0) {
      onRemove(product.id)
      return
    }

    onQtyChange(product, Number(inputValue))
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onDecrease(product)}
        className="cursor-pointer w-7 h-7 flex items-center justify-center bg-secondary rounded-full active:scale-95 transition-transform hover:bg-border"
      >
        <Minus size={13} />
      </button>

      <input
        type="number"
        min={0}
        value={inputValue}
        onFocus={() => setIsEditing(true)}
        onChange={handleQtyChange}
        onBlur={handleBlur}
        className="
          w-12 h-8
          rounded-lg
          border border-border
          bg-background
          text-sm font-semibold text-center tabular-nums
          text-foreground
          outline-none
          transition-all
          focus:border-primary
          focus:ring-2 focus:ring-primary/20
          hover:border-primary/50
          [appearance:textfield]
          [&::-webkit-inner-spin-button]:appearance-none
          [&::-webkit-outer-spin-button]:appearance-none
        "
      />

      <button
        onClick={() => onIncrease(product)}
        className="cursor-pointer w-7 h-7 flex items-center justify-center bg-accent text-accent-foreground rounded-full active:scale-95 transition-transform hover:bg-accent/80"
      >
        <Plus size={13} />
      </button>

      <button
        onClick={() => onRemove(product.id)}
        className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
