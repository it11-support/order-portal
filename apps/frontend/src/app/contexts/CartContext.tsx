import { createContext, useContext, useState, Dispatch, SetStateAction } from 'react'
import type { CartItem, Product } from '@repo/shared'

type CartContextType = {
  cart: CartItem[]
  setCart: Dispatch<SetStateAction<CartItem[]>>
  getQty: (pid: string) => number
  setQty: (product: Product, qty: number) => void
  increase: (product: Product) => void
  decrease: (product: Product) => void
  remove: (productId: string) => void
  cartCount: number
  cartQty: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([])

  function getQty(pid: string) {
    return cart.find((i) => i.product.id === pid)?.qty ?? 0
  }

  function setQty(product: Product, qty: number) {
    if (qty <= 0) setCart((c) => c.filter((i) => i.product.id !== product.id))
    else
      setCart((c) => {
        const ex = c.find((i) => i.product.id === product.id)
        if (ex) return c.map((i) => (i.product.id === product.id ? { ...i, qty } : i))
        return [...c, { product, qty }]
      })
  }

  function increase(product: Product) {
    const q = getQty(product.id)
    setQty(product, q === 0 ? product.minOrder : q + product.step)
  }

  function decrease(product: Product) {
    const q = getQty(product.id)
    if (q <= product.minOrder) setQty(product, 0)
    else setQty(product, q - product.step)
  }
 
  const remove = (productId: string) => {
  setCart((prev) =>
    prev.filter((item) => item.product.id !== productId),
  )
}

  const cartCount = cart.length
  const cartQty = cart.reduce((s, i) => s + i.qty, 0)

  return (
    <CartContext.Provider value={{ cart, setCart, getQty, setQty, increase, decrease, cartCount, cartQty, remove }}>
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