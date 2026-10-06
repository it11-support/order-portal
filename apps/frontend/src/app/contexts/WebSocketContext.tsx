import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useAuth } from './authHook'
import { api } from '@lib'

export type WSEvent = {
  type: string
  data: Record<string, unknown>
  timestamp: string
  userId?: number
}

type WebSocketContextType = {
  socket: Socket | null
  connected: boolean
  connect: () => void
  disconnect: () => void
  subscribe: (channels: string[]) => void
  unsubscribe: (channels: string[]) => void
  onEvent: (type: string, handler: (event: WSEvent) => void) => () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

const WS_URL =
  import.meta.env.VITE_WS_URL || new URL(api.defaults.baseURL!, window.location.origin).origin

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, accessToken, loading: authLoading } = useAuth()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const handlersRef = useRef<Map<string, Set<(event: WSEvent) => void>>>(new Map())
  const socketRef = useRef<Socket | null>(null)

  const connect = useCallback(() => {
    if (socketRef.current || authLoading || !user || !accessToken) return

    const newSocket = io(WS_URL, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    })

    newSocket.on('connect', () => {
      setConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      setConnected(false)
      console.log('[WS] Disconnected:', reason)
    })

    newSocket.on('connect_error', (error: Error & { description?: string; context?: unknown }) => {
      console.error('[WS] Connection error:', error.message, error.description, error.context)
    })

    newSocket.on('notification', (event: WSEvent) => {
      const handlers = handlersRef.current.get(event.type)
      if (handlers) {
        handlers.forEach((handler) => handler(event))
      }
      const allHandlers = handlersRef.current.get('*')
      if (allHandlers) {
        allHandlers.forEach((handler) => handler(event))
      }
    })

    socketRef.current = newSocket
    setSocket(newSocket)
  }, [authLoading, user, accessToken])

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [])

  const subscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', channels)
    }
  }, [])

  const unsubscribe = useCallback((channels: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', channels)
    }
  }, [])

  const onEvent = useCallback((type: string, handler: (event: WSEvent) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }
    handlersRef.current.get(type)!.add(handler)

    return () => {
      handlersRef.current.get(type)?.delete(handler)
    }
  }, [])

  useEffect(() => {
    if (user && accessToken && !authLoading) {
      connect()
    } else if (!user) {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, accessToken, authLoading, connect, disconnect])

  return (
    <WebSocketContext.Provider
      value={{ socket, connected, connect, disconnect, subscribe, unsubscribe, onEvent }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export const useWebSocket = () => {
  const ctx = useContext(WebSocketContext)
  if (!ctx) throw new Error('useWebSocket must be used within WebSocketProvider')
  return ctx
}

export const useWSEvent = (type: string, handler: (event: WSEvent) => void) => {
  const { onEvent } = useWebSocket()
  const handlerRef = useRef(handler)
  useEffect(() => {
    handlerRef.current = handler
  }, [handler])
  useEffect(() => onEvent(type, (event) => handlerRef.current(event)), [onEvent, type])
}

export default WebSocketProvider
