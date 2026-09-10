import { Server as HttpServer } from 'http'
import { Server, Socket } from 'socket.io'
import { verifyAccessToken } from '@/utils/jwt'
import { prisma } from '@/utils'

export interface WSEventPayload {
  type: string
  data: Record<string, unknown>
  timestamp: string
  userId?: number
}

interface AuthenticatedSocket extends Socket {
  userId?: number
  userRole?: string
  customerId?: string
}

class WebSocketService {
  private io: Server | null = null
  private userSockets: Map<number, Set<string>> = new Map()

  initialize(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    })

    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth.token ??
          socket.handshake.headers.authorization?.replace('Bearer ', '')
        if (!token) {
          console.log('[WS Auth] No token provided')
          return next(new Error('Authentication required'))
        }
        const payload = verifyAccessToken(token)
        if (!payload) {
          console.log('[WS Auth] Invalid token')
          return next(new Error('Invalid token'))
        }
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, role: { select: { name: true } }, customerId: true, isActive: true },
        })

        if (user) {
          if (!user.isActive) {
            console.log('[WS Auth] User not active')
            return next(new Error('User not active'))
          }
          socket.userId = user.id
          socket.userRole = user.role.name
          socket.customerId = user.customerId?.toString()
          next()
          return
        }
        const customer = await prisma.customers.findUnique({
          where: { id: BigInt(payload.userId) },
          select: { id: true, NonActive: true },
        })

        if (!customer || customer.NonActive === 'Y') {
          console.log('[WS Auth] Customer not found or inactive')
          return next(new Error('User not found or inactive'))
        }
        socket.userId = Number(customer.id)
        socket.userRole = 'customer'
        socket.customerId = customer.id.toString()
        next()
      } catch (e) {
        console.log('[WS Auth] Error:', e)
        next(new Error('Authentication failed'))
      }
    })

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      this.registerUserSocket(socket.userId!, socket.id)

      socket.on('disconnect', () => {
        this.unregisterUserSocket(socket.userId!, socket.id)
      })

      socket.on('subscribe', (channels: string[]) => {
        channels.forEach((channel) => socket.join(channel))
      })

      socket.on('unsubscribe', (channels: string[]) => {
        channels.forEach((channel) => socket.leave(channel))
      })
    })

    return this.io
  }

  private registerUserSocket(userId: number, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set())
    }
    this.userSockets.get(userId)!.add(socketId)
  }

  private unregisterUserSocket(userId: number, socketId: string) {
    const sockets = this.userSockets.get(userId)
    if (sockets) {
      sockets.delete(socketId)
      if (sockets.size === 0) {
        this.userSockets.delete(userId)
      }
    }
  }

  private emitToUser(userId: number, event: string, payload: WSEventPayload) {
    const sockets = this.userSockets.get(userId)
    if (sockets && this.io) {
      sockets.forEach((socketId) => {
        this.io!.to(socketId).emit(event, payload)
      })
    }
  }

  private async emitToAdmins(event: string, payload: WSEventPayload) {
    if (!this.io) return
    const admins = await prisma.user.findMany({
      where: { role: { name: { in: ['admin', 'sales_admin'] } }, isActive: true },
      select: { id: true },
    })
    for (const admin of admins) {
      this.emitToUser(admin.id, event, payload)
    }
  }

  private async emitToCustomer(customerId: string, event: string, payload: WSEventPayload) {
    if (!this.io) return
    const user = await prisma.user.findFirst({
      where: { customerId: BigInt(customerId), isActive: true },
      select: { id: true },
    })
    if (user) {
      this.emitToUser(user.id, event, payload)
      return
    }
    const customer = await prisma.customers.findUnique({
      where: { id: BigInt(customerId) },
      select: { id: true, NonActive: true },
    })
    if (customer && customer.NonActive !== 'Y') {
      this.emitToUser(Number(customer.id), event, payload)
    }
  }

  emitOrderCreated(
    orderId: string,
    customerId: string,
    customerName: string,
    kind: 'order' | 'quote',
    items: Array<{
      productId: string
      productName: string
      qty?: number
      price?: number
      total?: number
    }>,
    totalAmount: number,
  ) {
    const payload: WSEventPayload = {
      type: kind === 'order' ? 'order.created' : 'quote.created',
      data: { orderId, customerId, customerName, kind, items, totalAmount },
      timestamp: new Date().toISOString(),
    }
    this.emitToAdmins('notification', payload)
  }

  emitOrderStatusChanged(
    orderId: string,
    customerId: string,
    oldStatus: string,
    newStatus: string,
    kind: 'order' | 'quote',
    salesNotes?: string,
  ) {
    const payload: WSEventPayload = {
      type: 'order.status_changed',
      data: { orderId, customerId, oldStatus, newStatus, kind, salesNotes },
      timestamp: new Date().toISOString(),
    }
    this.emitToAdmins('notification', payload)
    this.emitToCustomer(customerId, 'notification', payload)
  }

  emitFollowUpAdded(
    orderId: string,
    customerId: string,
    followUpNote: string,
    kind: 'order' | 'quote',
  ) {
    const payload: WSEventPayload = {
      type: 'order.followup_added',
      data: { orderId, customerId, followUpNote, kind },
      timestamp: new Date().toISOString(),
    }
    this.emitToAdmins('notification', payload)
    this.emitToCustomer(customerId, 'notification', payload)
  }

  emitNotificationCreated(notification: {
    id: string
    userId: number
    title: string
    message: string
    type: string
    relatedId: string | null
    read: boolean
    dismissed: boolean
    createdAt: Date
  }) {
    const payload: WSEventPayload = {
      type: 'notification.created',
      data: notification,
      timestamp: new Date().toISOString(),
      userId: notification.userId,
    }
    this.emitToUser(notification.userId, 'notification', payload)
  }

  emitNotificationRead(notificationId: string, userId: number) {
    const payload: WSEventPayload = {
      type: 'notification.read',
      data: { notificationId },
      timestamp: new Date().toISOString(),
      userId,
    }
    this.emitToUser(userId, 'notification', payload)
  }

  emitNotificationDismissed(notificationId: string, userId: number) {
    const payload: WSEventPayload = {
      type: 'notification.dismissed',
      data: { notificationId },
      timestamp: new Date().toISOString(),
      userId,
    }
    this.emitToUser(userId, 'notification', payload)
  }

  getConnectedUsersCount(): number {
    return this.userSockets.size
  }

  getUserSocketCount(userId: number): number {
    return this.userSockets.get(userId)?.size ?? 0
  }
}

export const ws = new WebSocketService()
