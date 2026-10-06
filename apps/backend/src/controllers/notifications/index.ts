import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { ws } from '@/services/websocket'

const serialize = (row: any) => ({
  id: row.id,
  userId: row.userId,
  title: row.title,
  message: row.message,
  type: row.type,
  relatedId: row.relatedId,
  kind: row.kind ?? null,
  read: row.read,
  dismissed: row.dismissed,
  createdAt: row.createdAt,
})

const getNotificationUserId = async (req: AuthenticatedRequest): Promise<number> => {
  if (!req.user) return 0
  if (req.user.role.name !== 'customer') return Number(req.user.id)
  if (!req.user.customerId) return 0
  const customerUser = await prisma.user.findFirst({
    where: {
      id: Number(req.user.id),
      customerId: BigInt(String(req.user.customerId)),
      isActive: true,
    },
    select: { id: true },
  })
  return customerUser?.id ?? 0
}

export const listNotifications = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const userId = await getNotificationUserId(req)
  const rows = await prisma.notification.findMany({
    where: { userId, dismissed: false },
    orderBy: { createdAt: 'desc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map(serialize) })
}

export const listAllNotifications = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const userId = await getNotificationUserId(req)
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map(serialize) })
}

export const markNotificationRead = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const userId = await getNotificationUserId(req)
  const row = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId },
  })
  if (!row) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' })
  if (row.read) return res.json({ data: serialize(row) })
  const updated = await prisma.notification.update({
    where: { id: row.id },
    data: { read: true },
  })
  ws.emitNotificationRead(row.id, userId)
  return res.json({ data: serialize(updated) })
}

export const dismissNotification = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const userId = await getNotificationUserId(req)
  const row = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId },
  })
  if (!row) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' })
  const updated = await prisma.notification.update({
    where: { id: row.id },
    data: { dismissed: true },
  })
  ws.emitNotificationDismissed(row.id, userId)
  return res.json({ data: serialize(updated) })
}

export const unreadCount = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const userId = await getNotificationUserId(req)
  const count = await prisma.notification.count({
    where: { userId, read: false, dismissed: false },
  })
  return res.json({ data: { count } })
}
