import type { Dispatch, KeyboardEvent, SetStateAction } from 'react'

type ComboboxKeyDownOptions<T> = {
  query: string
  open: boolean
  ready: boolean
  items: T[]
  activeIndex: number
  setOpen: Dispatch<SetStateAction<boolean>>
  setActiveIndex: Dispatch<SetStateAction<number>>
  onSelect: (item: T) => void
  selectFirstOnEnter?: boolean
  preventEscapeDefault?: boolean
}

export const handleComboboxKeyDown = <T>(
  event: KeyboardEvent<HTMLInputElement>,
  options: ComboboxKeyDownOptions<T>,
): void => {
  const {
    query,
    open,
    ready,
    items,
    activeIndex,
    setOpen,
    setActiveIndex,
    onSelect,
    selectFirstOnEnter = false,
    preventEscapeDefault = true,
  } = options

  if (event.key === 'Escape') {
    if (open && preventEscapeDefault) {
      event.preventDefault()
    }

    setOpen(false)
    setActiveIndex(-1)
    return
  }

  if (!query.trim()) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    setOpen(true)

    if (!ready || items.length === 0) return

    setActiveIndex((current) => {
      if (event.key === 'ArrowDown') {
        return (current + 1) % items.length
      }

      return current <= 0 ? items.length - 1 : current - 1
    })

    return
  }

  if (event.key !== 'Enter' || !open || !ready) {
    return
  }

  // Customer boleh memilih item pertama.
  // Produk wajib memiliki pilihan aktif.
  const index = activeIndex >= 0 ? activeIndex : selectFirstOnEnter ? 0 : -1

  if (index < 0) {
    // Customer sebelumnya tetap menahan Enter
    // ketika dropdown terbuka.
    if (selectFirstOnEnter) event.preventDefault()
    return
  }

  const selected = items[index]

  if (selectFirstOnEnter) {
    event.preventDefault()
  }

  if (!selected) return

  event.preventDefault()
  onSelect(selected)
}
