import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { api } from '@lib'
import { useAuth } from './AuthContext'
import { useWebSocket, useWSEvent } from './WebSocketContext'

export type Notification = {
  id: string
  userId: number
  title: string
  message: string
  type: string
  relatedId: string | null
  read: boolean
  dismissed: boolean
  createdAt: string
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

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length
  const { connected } = useWebSocket()
  const requestVersion = useRef(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    const version = ++requestVersion.current
    setLoading(true)
    try {
      const response = await api.get('/notifications')
      if (version === requestVersion.current) setNotifications(response.data.data)
    } catch {
      // Keep the last known notifications if the connection is unavailable.
    } finally {
      if (version === requestVersion.current) setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && user) void load()
    else {
      setNotifications([])
      setLoading(false)
    }
    return () => {
      requestVersion.current += 1
    }
  }, [user, authLoading, connected, load])

  // Reload persisted state for both orders and inquiries. This also makes
  // duplicate events and changes from another admin tab idempotent.
  useWSEvent('notification.created', () => {
    void load()
  })
  useWSEvent('notification.read', () => {
    void load()
  })
  useWSEvent('notification.dismissed', () => {
    void load()
  })

  const refresh = async () => {
    await load()
  }

  const markRead = async (id: string) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? res.data.data : n)))
    } catch {
      // silent
    }
  }

  const dismiss = async (id: string) => {
    try {
      const res = await api.patch(`/notifications/${id}/dismiss`)
      setNotifications((prev) => prev.map((n) => (n.id === id ? res.data.data : n)))
    } catch {
      // silent
    }
  }

  const markAllRead = async () => {
    try {
      await Promise.all(
        notifications
          .filter((n) => !n.read && !n.dismissed)
          .map((n) => api.patch(`/notifications/${n.id}/read`)),
      )
      await load()
    } catch {
      // silent
    }
  }

  return (
    <NotificationsContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markRead, dismiss, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext)
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider')
  return ctx
}

export default NotificationsProvider
