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
  read: row.read,
  dismissed: row.dismissed,
  createdAt: row.createdAt,
})

export async function listNotifications(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const rows = await prisma.notification.findMany({
    where: { userId: Number(req.user.id), dismissed: false },
    orderBy: { createdAt: 'desc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map(serialize) })
}

export async function listAllNotifications(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const rows = await prisma.notification.findMany({
    where: { userId: Number(req.user.id) },
    orderBy: { createdAt: 'desc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: rows.map(serialize) })
}

export async function markNotificationRead(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const row = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: Number(req.user.id) },
  })
  if (!row) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' })
  if (row.read) return res.json({ data: serialize(row) })
  const updated = await prisma.notification.update({
    where: { id: row.id },
    data: { read: true },
  })
  ws.emitNotificationRead(row.id, Number(req.user.id))
  return res.json({ data: serialize(updated) })
}

export async function dismissNotification(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const row = await prisma.notification.findFirst({
    where: { id: String(req.params.id), userId: Number(req.user.id) },
  })
  if (!row) return res.status(404).json({ message: 'Notifikasi tidak ditemukan.' })
  const updated = await prisma.notification.update({
    where: { id: row.id },
    data: { dismissed: true },
  })
  ws.emitNotificationDismissed(row.id, Number(req.user.id))
  return res.json({ data: serialize(updated) })
}

export async function unreadCount(req: AuthenticatedRequest, res: Response) {
  if (!req.user) return res.status(401).json({ message: 'Tidak terautentikasi.' })
  const count = await prisma.notification.count({
    where: { userId: Number(req.user.id), read: false, dismissed: false },
  })
  return res.json({ data: { count } })
}
