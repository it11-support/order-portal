import { prisma } from '@/utils'
import { actorOf } from '@/services/requests/access'
import { AuthenticatedRequest } from '@/auth'
import { adminRecipients, customerRecipientFor, staffRecipientsFor } from '@/services/audience'
import { ws } from '@/services/websocket'

type Actor = NonNullable<ReturnType<typeof actorOf>>

type RequestRow = Awaited<ReturnType<typeof import('./create-pending').createPendingRequest>>

type SnapshotItem = {
  product?: {
    id?: string | number | bigint
    itemName?: string
  } | null
  qty?: number
  price?: number
  lineTotal?: number | null
}

export const notifyRequestCreated = async (
  row: RequestRow,
  actor: Actor,
  req: AuthenticatedRequest,
): Promise<void> => {
  const kindLabel = row.kind === 'quote' ? 'Permintaan Penawaran' : 'Pesanan'

  const customerLabel = row.customer.CardName || row.customer.CntctPrsn || 'pelanggan'

  const recipients = actor.role === 'customer' ? await staffRecipientsFor(row.customer) : []

  if (actor.role !== 'customer') {
    const customerUser = await customerRecipientFor(row.customerId)

    if (customerUser) {
      recipients.push(customerUser)
    }
  }

  if (actor.role === 'sales_admin') {
    const admins = await adminRecipients()
    recipients.push(...admins)
  }

  const createdNotifications = await prisma.notification.createManyAndReturn({
    data: recipients.map((user) => ({
      userId: user.id,
      title:
        actor.role === 'customer'
          ? `${kindLabel} baru dari ${customerLabel}`
          : `${kindLabel} baru untuk ${customerLabel}`,
      message:
        actor.role === 'customer'
          ? `${kindLabel} ${row.id} menunggu tindakan.`
          : `${kindLabel} ${row.id} dibuat oleh sales ${req.user!.name}.`,
      type: row.kind === 'quote' ? 'new_quote' : 'new_order',
      relatedId: row.id,
      kind: row.kind,
    })),
  })

  for (const notification of createdNotifications) {
    ws.emitNotificationCreated(notification)
  }

  const snapshot = Array.isArray(row.items) ? (row.items as SnapshotItem[]) : []

  const itemsWithPricing = snapshot.map((item) => ({
    productId: String(item.product?.id ?? ''),
    productName: item.product?.itemName ?? 'Unknown',
    qty: item.qty ?? 1,
    price: item.price ?? 0,
    total: item.lineTotal ?? 0,
  }))

  const totalAmount = itemsWithPricing.reduce((sum, item) => sum + item.total, 0)

  if (row.kind !== 'order' && row.kind !== 'quote') {
    throw new Error(`Invalid request kind: ${row.kind}`)
  }

  ws.emitOrderCreated(
    row.id,
    String(row.customerId),
    customerLabel,
    row.kind,
    itemsWithPricing,
    totalAmount,
  )
}
