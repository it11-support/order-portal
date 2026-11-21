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
import { api, swrFetcher } from '@lib'
import useSWR, { useSWRConfig } from 'swr'
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
  refreshOrders: () => Promise<void>
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
  addFollowUp: (id: string, message: string, visibility?: 'customer' | 'internal') => Promise<void>
  followUps: Record<string, FollowUpNote[]>
}
const OrderContext = createContext<OrderContextType | null>(null)
export const OrderProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [followUps, setFollowUps] = useState<Record<string, FollowUpNote[]>>({})
  const busy = useRef(false)
  const { mutate: globalMutate } = useSWRConfig()

  type RequestsResponse = {
    data: Order[]
  }

  const {
    data: response,
    mutate,
    isLoading,
    error: swrError,
  } = useSWR<RequestsResponse>(
    identity ? (['/requests', identity] as const) : null,
    ([url]) => swrFetcher<RequestsResponse>(url),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      refreshWhenHidden: false,
      refreshWhenOffline: false,
      dedupingInterval: 2_000,
      keepPreviousData: false,
    },
  )
  const orders = response?.data ?? []
  const loading = Boolean(identity) && isLoading
  const displayError = error || (swrError ? 'Gagal memuat pesanan dan penawaran.' : '')

  const refresh = useCallback(async () => {
    if (!identity) return
    await mutate()
  }, [identity, mutate])

  useEffect(() => {
    setError('')
    setOrderPlaced(false)
    setFollowUps({})
  }, [identity])

  const followUpKey = useCallback(
    (id: string) => `/requests/${encodeURIComponent(id)}/follow-ups`,
    [],
  )

  const refreshFollowUps = useCallback(
    async (id: string): Promise<FollowUpNote[]> => {
      if (!identity) return []
      const key = followUpKey(id)
      const response = await globalMutate(key, () => swrFetcher<{ data: FollowUpNote[] }>(key), {
        revalidate: false,
        populateCache: true,
      })
      const notes = response?.data ?? []
      // Compatibility for existing consumers of useOrders().followUps.
      setFollowUps((previous) => ({ ...previous, [id]: notes }))
      return notes
    },
    [identity, followUpKey, globalMutate],
  )

  const refreshDetail = useCallback(
    async (id: string) => {
      if (!identity) return
      await globalMutate(`/requests/${encodeURIComponent(id)}`)
    },
    [identity, globalMutate],
  )

  useWSEvent('order.status_changed', (event) => {
    if (!identity) return
    void refresh()
    const orderId = String(event.data?.orderId ?? '')
    if (orderId) void refreshDetail(orderId)
  })
  // SAP moved the document behind an order. The portal mirrors that status, so
  // the list has to be re-read rather than patched locally.
  useWSEvent('order.sap_synced', (event) => {
    if (!identity) return
    void refresh()
    const orderId = String(event.data?.orderId ?? '')
    if (orderId) void refreshDetail(orderId)
  })
  useWSEvent('quote.followup_added', (event) => {
    const orderId = String(event.data?.orderId ?? '')
    if (orderId && identity) void refreshFollowUps(orderId).catch(() => undefined)
  })
  useWSEvent('order.followup_added', (event) => {
    const orderId = String(event.data?.orderId ?? '')
    if (orderId && identity) void refreshFollowUps(orderId).catch(() => undefined)
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
      await mutate(
        (current) => ({
          data: [order, ...(current?.data ?? []).filter((o) => o.id !== order.id)],
        }),
        { revalidate: false },
      )
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
        await mutate(
          (current) => ({
            data: [request, ...(current?.data ?? []).filter((o) => o.id !== request.id)],
          }),
          { revalidate: false },
        )
        return request
      } catch (e: any) {
        const message = e.response?.data?.message ?? 'Gagal menyimpan. Silakan coba lagi.'
        setError(message)
        throw new Error(message)
      }
    },
    [mutate],
  )
  const updateStatus: OrderContextType['updateStatus'] = useCallback(
    async (id, status, salesNotes = '') => {
      setError('')
      try {
        await api.patch(`/requests/${id}`, { status, salesNotes })
        await Promise.all([refresh(), refreshDetail(id)])
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal menyimpan tindak lanjut.')
        throw e
      }
    },
    [refresh, refreshDetail],
  )
  const fetchFollowUps = useCallback(
    async (id: string): Promise<FollowUpNote[]> => {
      try {
        return await refreshFollowUps(id)
      } catch {
        return []
      }
    },
    [refreshFollowUps],
  )
  const addFollowUp = useCallback(
    async (id: string, message: string, visibility: 'customer' | 'internal' = 'customer') => {
      setError('')
      try {
        await api.post(`/requests/${id}/follow-ups`, { message, visibility })
        await Promise.all([refreshFollowUps(id), refresh(), refreshDetail(id)])
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal mengirim pesan.')
        throw e
      }
    },
    [refreshFollowUps, refresh, refreshDetail],
  )
  const linkSapDocument = useCallback(
    async (id: string, docEntry: number) => {
      setError('')
      try {
        const response = await api.post(`/requests/${id}/sap-link`, { docEntry })
        await Promise.all([refresh(), refreshDetail(id)])
        return (response.data.message as string | null) ?? null
      } catch (e: any) {
        setError(e.response?.data?.message ?? 'Gagal menautkan dokumen.')
        throw e
      }
    },
    [refresh, refreshDetail],
  )
  const fetchOrder = useCallback(
    async (id: string): Promise<Order | null> => {
      if (!identity) return null

      const key = `/requests/${encodeURIComponent(id)}`

      try {
        const response = await globalMutate(key, () => swrFetcher<{ data: Order }>(key), {
          revalidate: false,
          populateCache: true,
        })

        return response?.data ?? null
      } catch {
        return null
      }
    },
    [identity, globalMutate],
  )
  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        submitting,
        error: displayError,
        refreshOrders: refresh,
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
