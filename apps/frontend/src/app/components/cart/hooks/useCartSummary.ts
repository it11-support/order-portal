import { useMemo } from 'react'
import { useCart } from '@contexts'

export const useCartSummary = () => {
  const { cart } = useCart()
  const total = useMemo(() => cart.reduce((sum, item) => {
    const price = item.acceptedPrice ?? item.price ?? item.product.price ?? 0
    return sum + Number(price) * (item.qty ?? 0)
  }, 0), [cart])

  const getItems = () => {
    const unique = new Map<string, { productId: string; qty: number }>()
    for (const line of cart) {
      const qty = Number(line.qty ?? 0)
      if (Number.isSafeInteger(qty) && qty > 0) {
        unique.set(String(line.product.id), { productId: String(line.product.id), qty })
      }
    }
    return [...unique.values()]
  }
  return { total, getItems }
}
