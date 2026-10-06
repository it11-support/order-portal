import { prisma } from '@/utils'
import { ws } from '@/services/websocket'
import { staffRecipientsFor } from '@/services/audience'
import {
  PRICE_INCREASE_ALERT_PERCENT,
  hasNegotiatedPrices,
  priceableCustomer,
  refreshCustomerPrices,
  type PriceMovement,
} from '@/services/pricing'

/**
 * Where a detected price movement becomes visible.
 *
 * A price change is not only a customer-side event. An inquiry exists precisely
 * to negotiate a price, so once the price for one of its items moves, the
 * conversation itself has to carry the news: otherwise the customer and the
 * sales person keep talking about a figure that is no longer on offer.
 *
 * This module owns that fan-out. Detection lives in the pricing service and
 * stays unaware of who needs to hear about it.
 */

/** An inquiry is "open" while a price is still being negotiated. */
const OPEN_INQUIRY_STATUSES = ['pending', 'processing']

const formatPrice = (value: number, currency: string | null) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency || 'IDR',
    maximumFractionDigits: 2,
  }).format(value)

const itemNames = async (itemCodes: string[]) => {
  if (!itemCodes.length) return new Map<string, string>()
  const rows = await prisma.product.findMany({
    where: { itemCode: { in: itemCodes } },
    select: { itemCode: true, itemName: true },
  })
  return new Map(rows.map((row) => [row.itemCode, row.itemName]))
}

/**
 * Staff who are allowed to see this customer's requests: admins always, plus the
 * sales person the customer is assigned to. Notifying a wider set would point
 * people at an inquiry they cannot open.
 */

interface InquiryRow {
  id: string
  customerId: bigint
  items: unknown
  customer: {
    CardCode: string | null
    CardName: string | null
    CntctPrsn: string | null
    SlpCode: number | null
  }
}

/**
 * Open inquiries of one customer that mention any of the moved items.
 * The item snapshot lives in a JSON column, so the match is done on the rows
 * that are already scoped by customer and status: a handful, not the table.
 */
const affectedInquiries = async (
  customerId: bigint,
  itemCodes: string[],
): Promise<InquiryRow[]> => {
  if (!itemCodes.length) return []
  const wanted = new Set(itemCodes)
  const rows = await prisma.portalRequest.findMany({
    where: {
      customerId,
      kind: 'quote',
      status: { in: OPEN_INQUIRY_STATUSES },
    },
    include: {
      customer: {
        select: { CardCode: true, CardName: true, CntctPrsn: true, SlpCode: true },
      },
    },
  })

  return rows.filter((row) => {
    const codes = new Set(inquiryItems(row))
    return [...codes].some((code) => wanted.has(code))
  })
}

/**
 * Writes the portal's own note into an inquiry. There is no user behind it, so
 * authorId stays null and authorRole marks the author as the system.
 */
const systemNote = (requestId: string, message: string) => {
  return prisma.followUpNote.create({
    data: {
      requestId,
      authorId: null,
      authorName: 'Portal',
      authorRole: 'system',
      source: 'system',
      visibility: 'customer',
      message,
    },
  })
}

export interface PriceChangeAnnouncement {
  itemCode: string
  itemName: string
  oldPrice: number
  newPrice: number
  changePct: number
  currency: string | null
  formattedOld: string
  formattedNew: string
  inquiryIds: string[]
}

/**
 * Publishes one round of detected movements.
 *
 * Returns what was announced, which the caller uses for its own logging.
 */
export const announcePriceChanges = async (
  customerId: bigint | string,
  movements: PriceMovement[],
): Promise<PriceChangeAnnouncement[]> => {
  const cid = BigInt(String(customerId))
  if (!movements.length) return []

  const customer = await prisma.customers.findUnique({
    where: { id: cid },
    select: { id: true, CardCode: true, CardName: true, CntctPrsn: true, SlpCode: true },
  })
  if (!customer) return []

  const movedCodes = movements.map((movement) => movement.itemCode)
  const names = await itemNames(movedCodes)
  const inquiries = await affectedInquiries(cid, movedCodes)

  const announcements: PriceChangeAnnouncement[] = movements.map((movement) => ({
    itemCode: movement.itemCode,
    itemName: movement.itemName ?? names.get(movement.itemCode) ?? movement.itemCode,
    oldPrice: movement.oldPrice!,
    newPrice: movement.newPrice,
    changePct: movement.changePct,
    currency: movement.currency,
    formattedOld: formatPrice(movement.oldPrice!, movement.currency),
    formattedNew: formatPrice(movement.newPrice, movement.currency),
    inquiryIds: inquiries
      .filter((inquiry) => inquiryItems(inquiry).includes(movement.itemCode))
      .map((inquiry) => inquiry.id),
  }))

  const increased = announcements.filter(
    (alert) => alert.changePct > 0 && alert.changePct >= PRICE_INCREASE_ALERT_PERCENT,
  )

  const customerUser = await prisma.user.findFirst({
    where: { customerId: cid, isActive: true },
    select: { id: true },
  })

  // 1. The customer gets a standalone notice for meaningful increases.
  if (increased.length && customerUser) {
    const summary = increased
      .map((alert) => `${alert.itemName}: ${alert.formattedOld} → ${alert.formattedNew}`)
      .join('\n')
    await prisma.notification.create({
      data: {
        userId: customerUser.id,
        title:
          increased.length === 1
            ? `Harga ${increased[0].itemName} naik`
            : `${increased.length} harga produk naik`,
        message: `Harga baru berlaku dan belum dikonfirmasi:\n${summary}`,
        type: 'price_increase',
        relatedId: increased[0].itemCode,
      },
    })
    await prisma.priceChangeLog.updateMany({
      where: {
        customerId: cid,
        itemCode: { in: increased.map((alert) => alert.itemCode) },
        direction: 'up',
        notifiedAt: null,
      },
      data: { notifiedAt: new Date() },
    })
  }

  // 2. Every open inquiry that mentions a moved item gets the news in its own
  //    conversation, so the negotiation continues from the current figure.
  const staffRecipients = await staffRecipientsFor(customer)

  for (const inquiry of inquiries) {
    const relevant = announcements.filter((alert) => alert.inquiryIds.includes(inquiry.id))
    if (!relevant.length) continue

    const lines = relevant.map((alert) => {
      const arrow = alert.changePct > 0 ? 'naik' : alert.changePct < 0 ? 'turun' : 'tetap'
      const pct = alert.changePct === 0 ? '' : ` ${Math.abs(alert.changePct).toFixed(2)}%`
      return `${alert.itemName}: ${alert.formattedOld} → ${alert.formattedNew} (${arrow}${pct})`
    })
    const message = `Harga untuk produk pada inquiry ini sudah diperbarui:\n${lines.join('\n')}`
    await systemNote(inquiry.id, message)

    const targets = [
      ...(customerUser ? [customerUser.id] : []),
      ...staffRecipients.map((user) => user.id),
    ]
    const notifications = await prisma.notification.createManyAndReturn({
      data: targets.map((userId) => ({
        userId,
        title: `Harga di inquiry ${inquiry.id} diperbarui`,
        message: relevant
          .map((alert) => `${alert.itemName}: ${alert.formattedOld} → ${alert.formattedNew}`)
          .join('\n'),
        type: 'price_increase',
        relatedId: inquiry.id,
        kind: 'quote',
      })),
    })
    for (const notification of notifications) ws.emitNotificationCreated(notification)
    ws.emitFollowUpAdded(inquiry.id, inquiry.customerId.toString(), message, 'quote')
  }

  ws.emitPriceIncreased(
    cid.toString(),
    announcements.map((alert) => ({
      itemCode: alert.itemCode,
      itemName: alert.itemName,
      oldPrice: alert.oldPrice,
      newPrice: alert.newPrice,
      changePct: alert.changePct,
    })),
  )

  return announcements
}

const inquiryItems = (inquiry: InquiryRow) => {
  const items = Array.isArray(inquiry.items) ? (inquiry.items as any[]) : []
  return items
    .map((item) => item?.product?.itemCode)
    .filter((code): code is string => typeof code === 'string')
}

/**
 * Opens an inquiry for ordering, once every line of it is priced.
 *
 * Nobody presses a button for this. The inquiry is created on the price list,
 * admin then writes the agreed price into the system, and the moment that price
 * is visible here the inquiry is orderable at it. So the gate asks the system
 * what it has right now, rather than trusting anything the browser said, and it
 * is safe to run on every read: an inquiry that is already open is left alone.
 *
 * Returns whether this call is what opened it.
 */
export const settleInquiryOrderability = async (requestId: string): Promise<boolean> => {
  const inquiry = await prisma.portalRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      kind: true,
      status: true,
      customerId: true,
      items: true,
      customer: {
        select: { CardCode: true, CardName: true, CntctPrsn: true, SlpCode: true },
      },
    },
  })
  if (!inquiry || inquiry.kind !== 'quote') return false
  if (!OPEN_INQUIRY_STATUSES.includes(inquiry.status)) return false

  const itemCodes = [...new Set(inquiryItems(inquiry as InquiryRow))]
  if (!itemCodes.length) return false

  const cid = BigInt(String(inquiry.customerId))
  const customer = await priceableCustomer(cid)
  if (!customer) return false

  // Ask the system what it holds now, before judging the inquiry against it. Any
  // movement is published first so the conversation never lags the price.
  const movements = await refreshCustomerPrices(customer, itemCodes)
  if (movements.length) await announcePriceChanges(cid, movements)

  if (!(await hasNegotiatedPrices(cid, itemCodes))) return false

  // Claimed with the status in the filter, so two readers arriving together
  // cannot both announce the same opening.
  const opened = await prisma.portalRequest.updateMany({
    where: { id: inquiry.id, status: { in: OPEN_INQUIRY_STATUSES } },
    data: { status: 'ready' },
  })
  if (opened.count !== 1) return false

  const message = 'Harga sudah tersedia di sistem. Inquiry ini siap dipesan.'
  await systemNote(inquiry.id, message)

  const customerLabel =
    inquiry.customer.CardName || inquiry.customer.CntctPrsn || inquiry.customer.CardCode || 'pelanggan'
  const customerUser = await prisma.user.findFirst({
    where: { customerId: cid, isActive: true },
    select: { id: true },
  })
  const targets = [
    ...(customerUser ? [customerUser.id] : []),
    ...(await staffRecipientsFor(inquiry.customer)).map((user) => user.id),
  ]
  if (targets.length) {
    const notifications = await prisma.notification.createManyAndReturn({
      data: targets.map((userId) => ({
        userId,
        title: `Inquiry ${inquiry.id} siap dipesan`,
        message: `Harga untuk ${customerLabel} sudah tersedia di sistem.`,
        type: 'status_update',
        relatedId: inquiry.id,
        kind: 'quote',
      })),
    })
    for (const notification of notifications) ws.emitNotificationCreated(notification)
  }

  ws.emitOrderStatusChanged(inquiry.id, cid.toString(), inquiry.status, 'ready', 'quote')
  ws.emitFollowUpAdded(inquiry.id, cid.toString(), message, 'quote')
  return true
}