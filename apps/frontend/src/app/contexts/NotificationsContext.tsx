import { createContext, useContext, useEffect, useCallback } from 'react'
import { api } from '@lib'
import { swrFetcher } from '@lib'
import { useAuth } from './authHook'
import { useWSEvent } from './WebSocketContext'
import useSWR from 'swr'

export type Notification = {
  id: string
  userId: number
  title: string
  message: string
  type: string
  relatedId: string | null
  /** 'order' | 'quote' — which list this belongs to. Null on older rows. */
  kind: string | null
  read: boolean
  dismissed: boolean
  createdAt: string
}

type NotificationResponse = {
  data: Notification[]
}

type NotificationsContextType = {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markRead: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | null>(null)

export const NotificationsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth()
  const identity = user ? `${user.role.name}:${user.id}` : ''
  const key = identity ? `/notifications?viewer=${encodeURIComponent(identity)}` : null
  const { data, isLoading, isValidating, mutate } = useSWR<NotificationResponse>(
    key,
    swrFetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    },
  )

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length
  const loading = isLoading || isValidating

  useEffect(() => {
    if (!identity) {
      void mutate({ data: [] }, { revalidate: false })
    }
  }, [identity, mutate])

  const refresh = useCallback(async () => {
    if (identity) {
      await mutate()
    }
  }, [identity, mutate])

  useWSEvent('notification.created', () => {
    void refresh()
  })
  useWSEvent('notification.read', () => {
    void refresh()
  })
  useWSEvent('notification.dismissed', () => {
    void refresh()
  })

  // Memoized because order detail pages list markRead in a useEffect
  // dependency array. A fresh identity on every render would re-run the
  // clearing effect constantly.
  const markRead = useCallback(
    async (id: string) => {
      try {
        const res = await api.patch<{ data: Notification }>(`/notifications/${id}/read`)
        await mutate(
          (current) =>
            current
              ? {
                  ...current,
                  data: current.data.map((notification) =>
                    notification.id === id ? res.data.data : notification,
                  ),
                }
              : current,
          { revalidate: false },
        )
      } catch {
        // Resync from the server. Safe to refetch: order detail pages guard
        // against re-calling this for the same id, so a persistently failing
        // endpoint resyncs once rather than spinning.
        await mutate()
      }
    },
    [mutate],
  )

  const dismiss = useCallback(
    async (id: string) => {
      try {
        const res = await api.patch<{ data: Notification }>(`/notifications/${id}/dismiss`)
        await mutate(
          (current) =>
            current
              ? {
                  ...current,
                  data: current.data.map((notification) =>
                    notification.id === id ? res.data.data : notification,
                  ),
                }
              : current,
          { revalidate: false },
        )
      } catch {
        await mutate()
      }
    },
    [mutate],
  )

  const markAllRead = useCallback(async () => {
    const unread = notifications.filter(
      (notification) => !notification.read && !notification.dismissed,
    )
    if (unread.length === 0) return

    try {
      await Promise.all(
        unread.map((notification) => api.patch(`/notifications/${notification.id}/read`)),
      )
      await mutate()
    } catch {
      await mutate()
    }
  }, [notifications, mutate])

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, dismiss, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

export default NotificationsProvider
