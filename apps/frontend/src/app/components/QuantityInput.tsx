import { Minus, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'

const QuantityInput = ({
  quantity,
  name,
  onCommit,
}: {
  quantity: number
  name: string
  onCommit: (qty: number) => void
}) => {
  const [draft, setDraft] = useState(String(quantity))
  const [editing, setEditing] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (!editing) setDraft(String(quantity))
  }, [quantity, editing])

  const commit = () => {
    if (cancelled) {
      setCancelled(false)
      setDraft(String(quantity))
      setEditing(false)
      return
    }

    const n = Number(draft)

    if (/^[0-9]+$/.test(draft) && Number.isSafeInteger(n) && n > 0) {
      if (n !== quantity) onCommit(n)
      setDraft(String(n))
    } else {
      setDraft(String(quantity))
    }

    setEditing(false)
  }

  const changeQuantity = (delta: number) => {
    const n = Number(draft)
    const current = /^[0-9]+$/.test(draft) && Number.isSafeInteger(n) && n > 0 ? n : quantity

    const next = current + delta
    if (next < 1 || !Number.isSafeInteger(next)) return

    setCancelled(false)
    setEditing(false)
    setDraft(String(next))
    if (next !== quantity) onCommit(next)
  }

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        aria-label={`Kurangi jumlah ${name}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => changeQuantity(-1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary"
      >
        <Minus size={14} />
      </button>

      <input
        type="text"
        inputMode="numeric"
        value={draft}
        aria-label={`Jumlah ${name}`}
        onFocus={(e) => {
          setEditing(true)
          e.currentTarget.select()
        }}
        onChange={(e) => {
          if (/^[0-9]*$/.test(e.target.value)) {
            setDraft(e.target.value)
          }
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setCancelled(true)
            setDraft(String(quantity))
            e.currentTarget.blur()
          }
        }}
        className="w-10 h-8 shrink-0 rounded-md border border-border px-1 text-center text-xs focus:border-accent focus:outline-none"
      />

      <button
        type="button"
        aria-label={`Tambah jumlah ${name}`}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => changeQuantity(1)}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border hover:bg-secondary"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}

export default QuantityInput
