import type { AuthenticatedRequest } from '@auth'
import { prisma } from '@/utils'
import { customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { ws } from '@/services/websocket'

// Persisted notifications and realtime events for a successful status transition.
export const publishRequestStatusChange = async (
  req: AuthenticatedRequest, row: any, effectiveStatus: string,
  status: any, salesNotes: any,
) => {
    const kindLabel = row.kind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'
    const customerUser = await customerRecipientFor(BigInt(String(row.customerId)))
    const staffRecipients = await staffRecipientsFor({ SlpCode: row.customer.SlpCode })
    const targets = [
      ...(customerUser ? [customerUser.id] : []),
      ...staffRecipients.map((user) => user.id),
    ].filter((userId) => userId !== Number(req.user!.id))
    const chatMessage = `${kindLabel} ${row.id} diperbarui. Status sekarang: ${effectiveStatus}.`
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
    if (targets.length) {
      const notifications = await prisma.notification.createManyAndReturn({
        data: targets.map((userId) => ({
          userId,
          title: `${kindLabel} ${row.id} diperbarui`,
          message: `Status sekarang: ${status}.`,
          type: 'status_update',
          relatedId: row.id,
          kind: row.kind,
        })),
      })
      for (const notification of notifications) ws.emitNotificationCreated(notification)
    }
    ws.emitOrderStatusChanged(
      row.id,
      String(row.customerId),
      row.status,
      status,
      row.kind as 'order' | 'quote',
      salesNotes,
    )
    ws.emitFollowUpAdded(row.id, String(row.customerId), chatMessage, row.kind as 'order' | 'quote')

}
