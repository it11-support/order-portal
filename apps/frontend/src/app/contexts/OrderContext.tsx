import { createContext, useContext, useState, Dispatch, SetStateAction } from 'react'
import type { Order, OrderStatus, CartItem } from '@repo/shared'
import { PRODUCTS } from '../lib/mock-data'

type OrderContextType = {
  orders: Order[]
  placeOrder: (
    cart: CartItem[],
    notes: string,
    setNotes: Dispatch<SetStateAction<string>>,
    clearCart: () => void,
  ) => void
  orderPlaced: boolean
  setOrderPlaced: Dispatch<SetStateAction<boolean>>
  updateStatus: (orderId: string, status: OrderStatus) => void
}

const OrderContext = createContext<OrderContextType | null>(null)

const SAMPLE_ORDERS: Order[] = [
  {
    id: 'ORD-2026-0001',
    userId: 'u1',
    userName: 'Budi Santoso',
    company: 'Hotel Grand Nusantara',
    items: [
      { product: PRODUCTS[0], qty: 50 },
      { product: PRODUCTS[5], qty: 10 },
      { product: PRODUCTS[7], qty: 20 },
    ],
    status: 'confirmed',
    createdAt: new Date('2026-06-12T08:30:00'),
    notes: 'Delivery sebelum jam 8 pagi',
  },
  {
    id: 'ORD-2026-0002',
    userId: 'u2',
    userName: 'Siti Rahma',
    company: 'Restoran Nusantara',
    items: [
      { product: PRODUCTS[13], qty: 15 },
      { product: PRODUCTS[15], qty: 10 },
    ],
    status: 'pending',
    createdAt: new Date('2026-06-13T09:15:00'),
    notes: '',
  },
  {
    id: 'ORD-2026-0003',
    userId: 'u1',
    userName: 'Budi Santoso',
    company: 'Hotel Grand Nusantara',
    items: [
      { product: PRODUCTS[31], qty: 10 },
      { product: PRODUCTS[32], qty: 5 },
      { product: PRODUCTS[1], qty: 8 },
    ],
    status: 'delivered',
    createdAt: new Date('2026-06-10T11:00:00'),
    notes: 'Sertakan invoice',
  },
  {
    id: 'ORD-2026-0004',
    userId: 'u3',
    userName: 'Dedi Kurniawan',
    company: 'Café Mentari',
    items: [
      { product: PRODUCTS[32], qty: 10 },
      { product: PRODUCTS[29], qty: 5 },
    ],
    status: 'processing',
    createdAt: new Date('2026-06-13T14:00:00'),
    notes: '',
  },
]

export function OrderProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(SAMPLE_ORDERS)
  const [orderPlaced, setOrderPlaced] = useState(false)

  function placeOrder(
    cart: CartItem[],
    notes: string,
    setNotes: Dispatch<SetStateAction<string>>,
    clearCart: () => void,
  ) {
    if (cart.length === 0) return
    const order: Order = {
      id: `ORD-2026-${String(orders.length + 1).padStart(4, '0')}`,
      userId: 'u1',
      userName: 'Budi Santoso',
      company: 'Hotel Grand Nusantara',
      items: [...cart],
      status: 'pending',
      createdAt: new Date(),
      notes,
    }
    setOrders((o) => [order, ...o])
    clearCart()
    setNotes('')
    setOrderPlaced(true)
    setTimeout(() => {
      setOrderPlaced(false)
    }, 1800)
  }

  function updateStatus(orderId: string, status: OrderStatus) {
    setOrders((o) => o.map((ord) => (ord.id === orderId ? { ...ord, status } : ord)))
  }

  return (
    <OrderContext.Provider value={{ orders, placeOrder, orderPlaced, setOrderPlaced, updateStatus }}>
      {children}
    </OrderContext.Provider>
  )
}

export const useOrders = () => {
  const ctx = useContext(OrderContext)
  if (!ctx) {
    throw new Error('useOrders must be used within OrderProvider')
  }
  return ctx
}