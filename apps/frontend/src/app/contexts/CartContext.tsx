import { createContext, useContext, useEffect, useState, Dispatch, SetStateAction } from 'react'
import type { CartItem, Product } from '@repo/shared'
import { useAuth } from './authHook'

type CartContextType = {
  cart: CartItem[]
  setCart: Dispatch<SetStateAction<CartItem[]>>
  /** Inquiry this basket was started from, so the order can be linked to it. */
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
    setItems(next)
  }

  const getQty = (pid: number) => {
    return cart.find((i) => i.product.id === pid)?.qty ?? 0
  }

  const onQtyChange = (product: Product, qty: number) => {
    setQty(product, qty)
  }

  const setQty = (product: Product, qty: number) => {
    // The price the customer saw when the item entered the cart is what the
    // order is placed against. The server compares it against the live price
    // and holds the order if the item got more expensive in the meantime.
    const acceptedPrice = product.price ?? null
    if (qty <= 0) setCart((c) => c.filter((i) => i.product.id !== product.id))
    else
      setCart((c) => {
        const ex = c.find((i) => i.product.id === product.id)
        if (ex) return c.map((i) => (i.product.id === product.id ? { ...i, qty } : i))
        return [...c, { product, qty, acceptedPrice }]
      })
  }

  const increase = (product: Product) => {
    const q = getQty(product.id)
    setQty(product, q === 0 ? 1 : q + 1)
  }

  const decrease = (product: Product) => {
    const q = getQty(product.id)
    if (q <= 1) setQty(product, 0)
    else setQty(product, q - 1)
  }

  const remove = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId))
  }

  const cartCount = cart.length
  const cartQty = cart.reduce((s, i) => s + (i.qty ?? 0), 0)

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
        cartCount,
        cartQty,
        remove,
        onQtyChange,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error('useCart must be used within CartProvider')
  }
  return ctx
}
