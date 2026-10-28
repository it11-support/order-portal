import type { Response } from 'express'
import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { currentCustomer } from '@/services/customer-catalog'
import { customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { ws } from '@/services/websocket'
import { actorOf, deniedMessage, customerSelect } from '@/services/requests/access'

const serializeFollowUp = (note: any) => ({
  id: note.id,
  requestId: note.requestId,
  author: {
    id: note.authorId,
    name: note.authorName ?? null,
    username: note.authorName ?? '',
    role: note.authorRole ?? 'customer',
  },
  source: note.source ?? 'user',
  visibility: note.visibility ?? 'customer',
  message: note.message,
  createdAt: note.createdAt,
})

/**
 * Creates and pushes the persisted notification for a new follow-up note.
 *
 * The author never receives their own message. A note that only exists as a
 * live WebSocket frame disappears on reload, so the bell and the notification
 * list both depend on this row being written.
 */
const notifyFollowUp = async (
  request: {
    id: string
    kind: string
    customerId: bigint
    customer: { CardCode: string | null; CardName: string | null; CntctPrsn: string | null; SlpCode: number | null }
  },
  note: { message: string },
  author: { id: number; name: string; staff: boolean },
) => {
  const customerLabel =
    request.customer.CardName || request.customer.CntctPrsn || request.customer.CardCode || 'pelanggan'
  const kindLabel = request.kind === 'quote' ? 'Penawaran' : 'Pesanan'

  let recipients: Array<{ id: number }>
  if (author.staff) {
    const customerUser = await customerRecipientFor(request.customerId)
    recipients = customerUser ? [customerUser] : []
  } else {
    recipients = await staffRecipientsFor(request.customer)
  }

  const targets = recipients.filter((user) => user.id !== author.id)
  if (!targets.length) return

  const notifications = await prisma.notification.createManyAndReturn({
    data: targets.map((user) => ({
      userId: user.id,
      title: author.staff
        ? `${kindLabel} ${request.id}: balasan dari sales`
        : `${kindLabel} ${request.id}: pesan baru dari ${customerLabel}`,
      message: note.message,
      type: 'followup_note',
      relatedId: request.id,
      kind: request.kind,
    })),
  })
  for (const notification of notifications) {
    ws.emitNotificationCreated(notification)
  }
}

export const listFollowUps = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })
  if (actor.role === 'customer' && !(await currentCustomer(req)))
    return res.status(403).json({ message: 'Akun pelanggan tidak aktif.' })

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })

  // Internal notes are the staff side of the conversation. A customer asking for
  // them would see margin talk they must never read.
  const notes = await prisma.followUpNote.findMany({
    where: { requestId: row.id, ...(actor.role === 'customer' ? { visibility: 'customer' } : {}) },
    orderBy: { createdAt: 'asc' },
  })
  res.setHeader('Cache-Control', 'no-store')
  return res.json({ data: notes.map(serializeFollowUp) })
}

export const createFollowUp = async (req: AuthenticatedRequest, res: Response) => {
  const actor = actorOf(req)
  if (!actor) return res.status(403).json({ message: deniedMessage(req) })

  const { message, visibility = 'customer' } = req.body ?? {}
  if (
    typeof message !== 'string' ||
    message.trim().length === 0 ||
    message.trim().length > 2000 ||
    (visibility !== 'customer' && visibility !== 'internal')
  ) {
    return res.status(400).json({ message: 'Pesan follow-up tidak valid.' })
  }

  const row = await prisma.portalRequest.findUnique({
    where: { id: String(req.params.id) },
    include: { customer: { select: customerSelect } },
  })
  if (!row) return res.status(404).json({ message: 'Permintaan tidak ditemukan.' })
  if (actor.role === 'customer' && String(row.customerId) !== String(req.user!.customerId))
    return res.status(403).json({ message: 'Akses ditolak.' })
  if (actor.role === 'sales_admin' && String(row.customer.SlpCode) !== String(actor.slpCode))
    return res
      .status(403)
      .json({ message: 'Akses ditolak. Hanya pelanggan dengan SlpCode Anda.' })

  // Only staff may keep a note internal, and the customer's own notes are always
  // visible to both sides.
  const noteVisibility = actor.role === 'customer' ? 'customer' : visibility

  const authorId = Number(req.user!.id)
  const authorName = req.user!.name ?? req.user!.username ?? 'System'
  const trimmed = message.trim()
  const note = await prisma.followUpNote.create({
    data: {
      requestId: row.id,
      authorId,
      authorName,
      authorRole: req.user!.role.name,
      source: 'user',
      visibility: noteVisibility,
      message: trimmed,
    },
  })

  if (noteVisibility === 'internal') {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(201).json({ data: serializeFollowUp(note) })
  }

  await notifyFollowUp(
    {
      id: row.id,
      kind: row.kind,
      customerId: BigInt(String(row.customerId)),
      customer: row.customer,
    },
    { message: trimmed },
    { id: authorId, name: authorName, staff: actor.role !== 'customer' },
  )
  ws.emitFollowUpAdded(
    row.id,
    String(row.customerId),
    trimmed,
    row.kind as 'order' | 'quote',
  )
  return res.status(201).json({ data: serializeFollowUp(note) })
}
