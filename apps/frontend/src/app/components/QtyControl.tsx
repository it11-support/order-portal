import { Product } from '@repo/shared'
import { Minus, Plus, Trash2, TrashIcon } from 'lucide-react'
import React from 'react'
import { useAuth } from '../contexts/AuthContext'

type QtyControlProps = {
  product: Product
  qty: number
  onIncrease: () => void
  onDecrease: () => void
  onRemove: () => void
}

const QtyControlComponent = ({
  product,
  qty,
  onIncrease,
  onDecrease,
  onRemove,
}: QtyControlProps) => {
  const { isCustomer } = useAuth()

  if (!isCustomer) return null

  if (qty === 0) {
    return (
      <button
        onClick={onIncrease}
        className="flex items-center gap-1 bg-accent text-accent-foreground text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform"
      >
        <Plus size={13} />
        Tambah
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onDecrease}
        className="w-7 h-7 flex items-center justify-center bg-secondary rounded-full active:scale-95 transition-transform hover:bg-border"
      >
        <Minus size={13} />
      </button>

      <span className="text-sm font-bold w-8 text-center tabular-nums">{qty}</span>

      <button
        onClick={onIncrease}
        className="w-7 h-7 flex items-center justify-center bg-accent text-accent-foreground rounded-full active:scale-95 transition-transform hover:bg-accent/80"
      >
        <Plus size={13} />
      </button>
      <button
        onClick={onRemove}
        className="w-7 h-7 flex items-center justify-center rounded-full border border-destructive/30 text-destructive hover:bg-destructive/5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

export const QtyControl = React.memo(QtyControlComponent)
