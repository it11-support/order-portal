import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { ws } from '@/services/websocket'
import { PortalRequest } from '@/generated/prisma/client'

type RequestKind = 'order' | 'quote'

type RequestStatusRow = Pick<
  PortalRequest,
  'id' | 'customerId' | 'status' | 'kind'
> & {
  customer: {
    SlpCode: number | null
  }
}


// Persisted notifications and realtime events for a successful status transition.
export const publishRequestStatusChange = async (
  req: AuthenticatedRequest,
  row: RequestStatusRow,
  effectiveStatus: string,
  salesNotes?: string,
): Promise<void> => {
  if (row.kind !== 'order' && row.kind !== 'quote') {
    throw new Error(`Jenis permintaan tidak valid: ${row.kind}`)
  }

  const kind: RequestKind = row.kind
  const kindLabel =
    kind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'

  const [customerUser, staffRecipients] = await Promise.all([
    customerRecipientFor(row.customerId),
    staffRecipientsFor({ SlpCode: row.customer.SlpCode }),
  ])

  const senderId = Number(req.user?.id)

  const targets = [
    ...new Set([
      ...(customerUser ? [customerUser.id] : []),
      ...staffRecipients.map((user) => user.id),
    ]),
  ].filter((userId) => userId !== senderId)

  const chatMessage =
    `${kindLabel} ${row.id} diperbarui. ` +
    `Status sekarang: ${effectiveStatus}.`

  await prisma.followUpNote.create({
    data: {
      requestId: row.id,
      authorId: null,
      authorName: 'Portal',
      authorRole: 'system',
      source: 'system',
      visibility: 'customer',
      message: chatMessage,
    },
  })

  if (targets.length > 0) {
    const notifications =
      await prisma.notification.createManyAndReturn({
        data: targets.map((userId) => ({
          userId,
          title: `${kindLabel} ${row.id} diperbarui`,
          message: `Status sekarang: ${effectiveStatus}.`,
          type: 'status_update',
          relatedId: row.id,
          kind,
        })),
      })

    for (const notification of notifications) {
      ws.emitNotificationCreated(notification)
    }
  }

  ws.emitOrderStatusChanged(
    row.id,
    String(row.customerId),
    row.status,
    effectiveStatus,
    kind,
    salesNotes,
  )

  ws.emitFollowUpAdded(
    row.id,
    String(row.customerId),
    chatMessage,
    kind,
  )
}
