import { createContext, useContext, useEffect, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import type { CartItem, Product } from '@repo/shared'
import { useAuth } from './authHook'

type CartContextType = {
  cart: CartItem[]
  setCart: Dispatch<SetStateAction<CartItem[]>>
  inquiryId: string | null
  setInquiryId: Dispatch<SetStateAction<string | null>>
  getQty: (pid: number) => number
  setQty: (product: Product, qty: number) => void
  increase: (product: Product) => void
  decrease: (product: Product) => void
  remove: (productId: number) => void
  cartCount: number
  cartQty: number
  onQtyChange: (product: Product, qty: number) => void
}

const CartContext = createContext<CartContextType | null>(null)
const productKey = (id: string | number) => String(id)

// Keep the last occurrence of an item (no quantity summing), while retaining
// the original ordering. This also cleans up carts saved by older code.
const normalizeCart = (items: CartItem[]): CartItem[] => {
  const byId = new Map<string, CartItem>()
  for (const item of items) {
    if (!item?.product?.id || !Number.isFinite(Number(item.qty)) || Number(item.qty) <= 0) continue
    const key = productKey(item.product.id)
    byId.set(key, { ...item, qty: Number(item.qty) })
  }
  return [...byId.values()]
}

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isCustomer } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const [items, setItems] = useState<CartItem[]>([])
  const [owner, setOwner] = useState(identity)
  const [inquiryId, setInquiryId] = useState<string | null>(null)
  const cart = isCustomer && owner === identity ? items : []

  useEffect(() => {
    setItems([])
    setOwner(identity)
    setInquiryId(null)
  }, [identity])

  const setCart: Dispatch<SetStateAction<CartItem[]>> = (next) => {
    if (!isCustomer) return
    setItems((previous) => normalizeCart(typeof next === 'function' ? next(previous) : next))
  }

  const getQty = (pid: number) =>
    cart.find((item) => productKey(item.product.id) === productKey(pid))?.qty ?? 0

  const setQty = (product: Product, qty: number) => {
    if (!Number.isFinite(qty)) return
    const key = productKey(product.id)
    setCart((previous) => {
      if (qty <= 0) return previous.filter((item) => productKey(item.product.id) !== key)
      const exists = previous.some((item) => productKey(item.product.id) === key)
      if (exists) {
        return previous.map((item) =>
          productKey(item.product.id) === key ? { ...item, qty } : item,
        )
      }
      return [...previous, { product, qty, acceptedPrice: product.price ?? null }]
    })
  }

  // Functional updates avoid stale quantities when users click +/- quickly.
  const adjustQty = (product: Product, delta: number) => {
    const key = productKey(product.id)
    setCart((previous) => {
      const existing = previous.find((item) => productKey(item.product.id) === key)
      const nextQty = (existing?.qty ?? 0) + delta
      if (nextQty <= 0) return previous.filter((item) => productKey(item.product.id) !== key)
      if (existing) {
        return previous.map((item) =>
          productKey(item.product.id) === key ? { ...item, qty: nextQty } : item,
        )
      }
      return [...previous, { product, qty: nextQty, acceptedPrice: product.price ?? null }]
    })
  }

  const increase = (product: Product) => adjustQty(product, 1)
  const decrease = (product: Product) => adjustQty(product, -1)
  const remove = (productId: number) =>
    setCart((previous) =>
      previous.filter((item) => productKey(item.product.id) !== productKey(productId)),
    )
  const onQtyChange = (product: Product, qty: number) => setQty(product, qty)

  const cartCount = cart.length
  const cartQty = cart.reduce((sum, item) => sum + (item.qty ?? 0), 0)

  return (
    <CartContext.Provider
      value={{
        cart,
        setCart,
        inquiryId,
        setInquiryId,
        getQty,
        setQty,
        increase,
        decrease,
        remove,
        cartCount,
        cartQty,
        onQtyChange,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within CartProvider')
  return context
}
