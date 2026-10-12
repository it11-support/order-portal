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
import type { Order, OrderStatus, CartItem, FollowUpNote, PriceChange } from '@repo/shared'
import { api } from '@lib'
import { useAuth } from './authHook'
import { useWSEvent } from './WebSocketContext'

/** Raised when the server holds an order because a price went up. */
export class PriceIncreasedError extends Error {
  changes: PriceChange[]
  constructor(changes: PriceChange[]) {
    super('Harga produk naik.')
    this.name = 'PriceIncreasedError'
    this.changes = changes
  }
}

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
    options?: { priceAccepted?: boolean; inquiryId?: string | null },
  ) => Promise<void>
  /**
   * Raises a request on behalf of a customer. Used by sales, who enter orders
   * and inquiries for their own customers.
   */
  submitForCustomer: (input: {
    kind: 'order' | 'quote'
    customerId: string
    items: Array<{ productId: string; qty: number }>
    notes: string
  }) => Promise<Order>
  sendQuote: (items: CartItem[], notes: string) => Promise<void>
  orderPlaced: boolean
  setOrderPlaced: Dispatch<SetStateAction<boolean>>
  updateStatus: (id: string, status: OrderStatus, salesNotes?: string) => Promise<void>
  linkSapDocument: (id: string, docEntry: number) => Promise<string | null>
  fetchOrder: (id: string) => Promise<Order | null>
  fetchFollowUps: (id: string) => Promise<FollowUpNote[]>
  addFollowUp: (
    id: string,
    message: string,
    visibility?: 'customer' | 'internal',
  ) => Promise<void>
  followUps: Record<string, FollowUpNote[]>
}
const OrderContext = createContext<OrderContextType | null>(null)
export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const [data, setData] = useState<{ owner: string; orders: Order[] }>({ owner: '', orders: [] })
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [followUps, setFollowUps] = useState<Record<string, FollowUpNote[]>>({})
  const busy = useRef(false)
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
  useWSEvent('order.status_changed', () => {
    if (identity) void refresh()
  })
  // SAP moved the document behind an order. The portal mirrors that status, so
  // the list has to be re-read rather than patched locally.
  useWSEvent('order.sap_synced', () => {
    if (identity) void refresh()
  })
  useWSEvent('quote.followup_added', (event) => {
    const orderId = String(event.data?.orderId ?? '')
    if (orderId && identity) void fetchFollowUpsInternal(orderId)
  })
  useWSEvent('order.followup_added', (event) => {
    const orderId = String(event.data?.orderId ?? '')
    if (orderId && identity) void fetchFollowUpsInternal(orderId)
  })
  const send = async (
    kind: 'order' | 'quote',
    items: CartItem[],
    notes: string,
    priceAccepted = false,
    inquiryId: string | null = null,
  ) => {
    if (busy.current) throw new Error('Permintaan sedang dikirim.')
    busy.current = true
    setSubmitting(true)
    setError('')
    const payload = {
      kind,
      items: items.map((i) => ({
        productId: String(i.product.id),
        qty: i.qty,
        price: i.acceptedPrice ?? i.product.price ?? undefined,
      })),
      notes,
      ...(inquiryId ? { inquiryId } : {}),
      ...(kind === 'order' ? { priceAccepted } : {}),
    }
    try {
      const response = await api.post('/requests', payload)
      const order: Order = response.data.data
      setData((previous) => ({
        owner: identity,
        orders: [
          order,
          ...(previous.owner === identity ? previous.orders.filter((o) => o.id !== order.id) : []),
        ],
      }))
    } catch (e: any) {
      if (e.response?.data?.code === 'PRICE_INCREASED') {
        // The order was never created, so the retry key must stay valid.
        throw new PriceIncreasedError(e.response.data.priceChanges ?? [])
      }
      const message = e.response?.data?.message ?? 'Gagal mengirim. Silakan coba lagi.'
      setError(message)
      throw new Error(message)
    } finally {
      busy.current = false
      setSubmitting(false)
    }
  }
  const placeOrder: OrderContextType['placeOrder'] = async (
    cart,
    notes,
    setNotes,
    clearCart,
    options,
  ) => {
    await send('order', cart, notes, options?.priceAccepted ?? false, options?.inquiryId ?? null)
    clearCart()
    setNotes('')
    setOrderPlaced(true)
  }
  const submitForCustomer = useCallback(
    async (input: {
      kind: 'order' | 'quote'
      customerId: string
      items: Array<{ productId: string; qty: number }>
      notes: string
    }) => {
      setError('')
      try {
        const response = await api.post('/requests', {
          kind: input.kind,
          customerId: input.customerId,
          items: input.items,
          notes: input.notes,
        })
        const request: Order = response.data.data
        setData((previous) => ({
          owner: identity,
          orders: [
            request,
            ...(previous.owner === identity ? previous.orders.filter((o) => o.id !== request.id) : []),
          ],
        }))
        return request
      } catch (e: any) {
        const message = e.response?.data?.message ?? 'Gagal menyimpan. Silakan coba lagi.'
        setError(message)
        throw new Error(message)
      }
    },
    [identity],
  )
  const fetchFollowUpsInternal = useCallback(
    async (id: string) => {
      if (!identity) return
      try {
        const response = await api.get(`/requests/${id}/follow-ups`)
        setFollowUps((prev) => ({ ...prev, [id]: response.data.data }))
      } catch {
        setFollowUps((prev) => ({ ...prev, [id]: [] }))
      }
    },
    [identity],
  )
  const updateStatus: OrderContextType['updateStatus'] = useCallback(
    async (id, status, salesNotes = '') => {
      setError('')
      try {
        await api.patch(`/requests/${id}`, { status, salesNotes })
        await refresh()
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal menyimpan tindak lanjut.')
        throw e
      }
    },
    [refresh],
  )
  const fetchFollowUps = useCallback(
    async (id: string): Promise<FollowUpNote[]> => {
      if (!identity) return []
      try {
        const response = await api.get(`/requests/${id}/follow-ups`)
        setFollowUps((prev) => ({ ...prev, [id]: response.data.data }))
        return response.data.data
      } catch {
        return []
      }
    },
    [identity],
  )
  const addFollowUp = useCallback(
    async (id: string, message: string, visibility: 'customer' | 'internal' = 'customer') => {
      setError('')
      try {
        await api.post(`/requests/${id}/follow-ups`, { message, visibility })
        await fetchFollowUpsInternal(id)
        await refresh()
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal mengirim pesan.')
        throw e
      }
    },
    [fetchFollowUpsInternal, refresh],
  )
  const linkSapDocument = useCallback(
    async (id: string, docEntry: number) => {
      setError('')
      try {
        const response = await api.post(`/requests/${id}/sap-link`, { docEntry })
        await refresh()
        return (response.data.message as string | null) ?? null
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal menautkan dokumen.')
        throw e
      }
    },
    [refresh],
  )
  const fetchOrder = useCallback(
    async (id: string): Promise<Order | null> => {
      try {
        const response = await api.get(`/requests/${id}`)
        return response.data.data
      } catch {
        return null
      }
    },
    [],
  )
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
        submitForCustomer,
         updateStatus,
         fetchOrder,
         linkSapDocument,
         fetchFollowUps,
         addFollowUp,
         followUps,
       }}
    >
      {children}
    </OrderContext.Provider>
  )
}
export const useOrders = () => {
  const context = useContext(OrderContext)
  if (!context) throw new Error('useOrders must be used within OrderProvider')
  return context
}
