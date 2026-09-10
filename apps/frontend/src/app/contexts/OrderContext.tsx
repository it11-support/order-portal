import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  Dispatch,
  SetStateAction,
} from 'react'
import type { Order, OrderStatus, CartItem } from '@repo/shared'
import { api } from '@lib'
import { useAuth } from './AuthContext'

type OrderContextType = {
  orders: Order[]
  loading: boolean
  submitting: boolean
  error: string
  placeOrder: (
    cart: CartItem[],
    notes: string,
    setNotes: Dispatch<SetStateAction<string>>,
    clearCart: () => void,
  ) => Promise<void>
  sendQuote: (items: CartItem[], notes: string) => Promise<void>
  orderPlaced: boolean
  setOrderPlaced: Dispatch<SetStateAction<boolean>>
  updateStatus: (id: string, status: OrderStatus, salesNotes?: string) => Promise<void>
  fetchOrder: (id: string) => Promise<Order | null>
}
const OrderContext = createContext<OrderContextType | null>(null)
export function OrderProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const [data, setData] = useState<{ owner: string; orders: Order[] }>({ owner: '', orders: [] })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderPlaced, setOrderPlaced] = useState(false)
  const busy = useRef(false)
  const requestKeys = useRef(new Map<string, string>())
  const refresh = useCallback(async () => {
    if (!identity) return
    const response = await api.get('/requests')
    setData({ owner: identity, orders: response.data.data })
  }, [identity])
  useEffect(() => {
    let disposed = false
    setError('')
    setOrderPlaced(false)
    setLoading(Boolean(identity))
    if (identity)
      api
        .get('/requests')
        .then((response) => {
          if (!disposed) setData({ owner: identity, orders: response.data.data })
        })
        .catch(() => {
          if (!disposed) setError('Gagal memuat pesanan dan penawaran.')
        })
        .finally(() => {
          if (!disposed) setLoading(false)
        })
    return () => {
      disposed = true
    }
  }, [identity])
  const send = async (kind: 'order' | 'quote', items: CartItem[], notes: string) => {
    if (busy.current) throw new Error('Permintaan sedang dikirim.')
    busy.current = true
    setSubmitting(true)
    setError('')
    const payload = {
      kind,
      items: items.map((i) => ({ productId: String(i.product.id), qty: i.qty })),
      notes,
    }
    const signature = `${identity}:${JSON.stringify(payload)}`
    const requestId = requestKeys.current.get(signature) ?? crypto.randomUUID()
    requestKeys.current.set(signature, requestId)
    try {
      const response = await api.post('/requests', { ...payload, requestId })
      const order: Order = response.data.data
      setData((previous) => ({
        owner: identity,
        orders: [
          order,
          ...(previous.owner === identity ? previous.orders.filter((o) => o.id !== order.id) : []),
        ],
      }))
      requestKeys.current.delete(signature)
    } catch (e: any) {
      const message = e.response?.data?.message ?? 'Gagal mengirim. Silakan coba lagi.'
      setError(message)
      throw new Error(message)
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }
  const placeOrder: OrderContextType['placeOrder'] = async (cart, notes, setNotes, clearCart) => {
    await send('order', cart, notes)
    clearCart()
    setNotes('')
    setOrderPlaced(true)
  }
  const updateStatus: OrderContextType['updateStatus'] = async (id, status, salesNotes = '') => {
    setError('')
    try {
      await api.patch(`/requests/${id}`, { status, salesNotes })
      await refresh()
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Gagal menyimpan tindak lanjut.')
      throw e
    }
  }
  const fetchOrder = async (id: string): Promise<Order | null> => {
    try {
      const response = await api.get(`/requests/${id}`)
      return response.data.data
    } catch {
      return null
    }
  }
  return (
    <OrderContext.Provider
      value={{
        orders: data.owner === identity ? data.orders : [],
        loading,
        submitting,
        error,
        placeOrder,
        sendQuote: (items, notes) => send('quote', items, notes),
        orderPlaced,
        setOrderPlaced,
        updateStatus,
        fetchOrder,
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}
export function useOrders() {
  const context = useContext(OrderContext)
  if (!context) throw new Error('useOrders must be used within OrderProvider')
  return context
}
