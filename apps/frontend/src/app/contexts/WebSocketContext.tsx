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

    newSocket.on('connect_error', (error: Error) => {
      setConnected(false)
      console.error('[WS] Connection error:', error.message)
    })

    newSocket.on('notification', (event: WSEvent) => {
      handlersRef.current.get(event.type)?.forEach((handler) => handler(event))
      handlersRef.current.get('*')?.forEach((handler) => handler(event))
    })

    socketRef.current = newSocket
    setSocket(newSocket)
  }, [authLoading, user, accessToken])

  const disconnect = useCallback(() => {
    const currentSocket = socketRef.current

    if (currentSocket) {
      currentSocket.removeAllListeners()
      currentSocket.disconnect()
      socketRef.current = null
    }

    setSocket(null)
    setConnected(false)
  }, [])

  const onEvent = useCallback((type: string, handler: (event: WSEvent) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set())
    }

    handlersRef.current.get(type)!.add(handler)

    return () => {
      const handlers = handlersRef.current.get(type)
      handlers?.delete(handler)

      if (handlers?.size === 0) {
        handlersRef.current.delete(type)
      }
    }
  }, [])

  useEffect(() => {
    if (user && accessToken && !authLoading) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [user, accessToken, authLoading, connect, disconnect])

  return (
    <WebSocketContext.Provider value={{ socket, connected, connect, disconnect, onEvent }}>
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
